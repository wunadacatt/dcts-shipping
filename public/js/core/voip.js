class VoIP {
    constructor(livekitUrl = "", applicationServerUrl = "") {
        this.APPLICATION_SERVER_URL = applicationServerUrl;
        this.LIVEKIT_URL = livekitUrl;
        this.room = null;
        this.participants = new Map();
        this.streamSettings = {
            resolution: "1920x1080",
            frameRate: 60,
            maxBitrate: 5_000_000,
        };

        this.onJoin = null;
        this.onLeave = null;
        this.onScreenshareBegin = null;
        this.onScreenshareEnd = null;
        this.onTrackSubscribed = null;
        this.onSpeaking = null;
        this.isScreensharing = false;

        this._micPub = null;

        this.configureUrls();
    }

    configureUrls() {
        if (!this.APPLICATION_SERVER_URL) this.APPLICATION_SERVER_URL = window.location.origin;
        if (!this.LIVEKIT_URL) throw new TypeError("No LiveKit URL set.");
    }

    _lp() {
        return this.room?.localParticipant || null;
    }

    _micEnabled() {
        const lp = this._lp();
        if (!lp) return false;
        return !!lp.isMicrophoneEnabled;
    }

    async joinRoom(roomName, userName, memberId, channelId) {
        this.room = new LivekitClient.Room();

        this.room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, _publication, participant) => {
            const isScreen = track.source === "screen" || track.source === LivekitClient.Track.Source.ScreenShare;

            this.storeTrack(participant.identity, track, isScreen);

            if (isScreen && this.onScreenshareBegin) this.onScreenshareBegin(participant.identity, track);
            if (this.onTrackSubscribed) this.onTrackSubscribed(track, participant.identity, isScreen);
        });

        this.room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            speakers.forEach(participant => {
                const id = participant.identity;
                if (this.onSpeaking) this.onSpeaking(id);
            });
        });

        this.room.on(LivekitClient.RoomEvent.ParticipantDisconnected, (participant) => {
            if (this.onLeave) this.onLeave(participant.identity);
        });

        this.room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
            const isScreen = track.source === "screen" || track.source === LivekitClient.Track.Source.ScreenShare;

            this.removeTrack(participant.identity, track, isScreen);

            if (isScreen && this.onScreenshareEnd) this.onScreenshareEnd(participant.identity);
        });

        try {
            const token = await this.getToken(roomName, userName, memberId, channelId);
            await this.room.connect(this.LIVEKIT_URL, token);

            this._micPub = await this.room.localParticipant.setMicrophoneEnabled(true, {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            });

            if (this.onJoin) this.onJoin(userName);
        } catch (e) {
            console.error("Error joining room:", e);
        }
    }

    storeTrack(participantId, track, isScreen = false) {
        if (!this.participants.has(participantId)) this.participants.set(participantId, {});
        const participant = this.participants.get(participantId);

        if (track.kind === "audio") participant.audioTrack = track;
        else if (track.kind === "video" && !isScreen) participant.videoTrack = track;
        else if (track.kind === "video" && isScreen) participant.screenTrack = track;
    }

    removeTrack(participantId, track, isScreen = false) {
        if (!this.participants.has(participantId)) return;
        const participant = this.participants.get(participantId);

        if (track.kind === "audio") participant.audioTrack = null;
        else if (track.kind === "video" && !isScreen) participant.videoTrack = null;
        else if (track.kind === "video" && isScreen) participant.screenTrack = null;
    }

    pauseStream(participantId, type = "video") {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        let track;
        if (type === "video") track = participant.videoTrack;
        else if (type === "audio") track = participant.audioTrack;
        else if (type === "screen") track = participant.screenTrack;

        if (track) track.detach().forEach(el => el.pause());
    }

    resumeStream(participantId, type = "video") {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        let track;
        if (type === "video") track = participant.videoTrack;
        else if (type === "audio") track = participant.audioTrack;
        else if (type === "screen") track = participant.screenTrack;

        if (track) track.detach().forEach(el => el.play());
    }

    setStreamSettings({resolution, frameRate, maxBitrate}) {
        if (resolution) this.streamSettings.resolution = resolution;
        if (frameRate) this.streamSettings.frameRate = frameRate;
        if (maxBitrate) this.streamSettings.maxBitrate = maxBitrate;
    }

    async stopScreenshare() {
        if (!this.room?.localParticipant) return;
        const participantId = this.room.localParticipant.identity;

        this.room.localParticipant.trackPublications.forEach(pub => {
            const track = pub.track;
            if (!track) return;

            const src = pub.source ?? track.source;
            const isScreen = src === LivekitClient.Track.Source.ScreenShare || src === "screen";
            if (!isScreen) return;

            this.room.localParticipant.unpublishTrack(track).catch(() => {});
            track.detach().forEach(el => el.remove());
            if (track.mediaStreamTrack) track.mediaStreamTrack.stop();
            if (track.kind === "audio" && typeof track.stop === "function") track.stop();
        });

        this.isScreensharing = false;
        if (this.onScreenshareEnd) this.onScreenshareEnd(participantId);
    }

    async shareScreen(includeAudio = false) {
        if (!this.room?.localParticipant) return;

        const participantId = this.room.localParticipant.identity;

        const tracks = await this.room.localParticipant.createScreenTracks({
            audio: includeAudio,
            video: {
                resolution: this.streamSettings.resolution,
                frameRate: this.streamSettings.frameRate,
                maxBitrate: this.streamSettings.maxBitrate,
                codec: "h264"
            },
        });

        for (const track of tracks) {
            await this.room.localParticipant.publishTrack(track);

            track.detach().forEach(el => el.pause());

            if (this.onScreenshareBegin) this.onScreenshareBegin(participantId, track);
            if (this.onTrackSubscribed) this.onTrackSubscribed(track, participantId, true);

            track.on("ended", () => {
                track.detach().forEach(el => el.remove());
                this.room.localParticipant.unpublishTrack(track);
                if (this.onScreenshareEnd) this.onScreenshareEnd(participantId);
            });

            this.isScreensharing = true;
        }
    }

    async getToken(roomName, participantName, memberId, channelId) {
        const response = await fetch(this.APPLICATION_SERVER_URL + "/token", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({roomName, participantName, memberId, channelId}),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to get token: ${error.errorMessage}`);
        }

        const token = await response.json();
        return token.token;
    }

    async muteMic() {
        if (!this.room?.localParticipant) return;
        await this.room.localParticipant.setMicrophoneEnabled(false).catch(()=>{});
    }

    async unmuteMic() {
        if (!this.room?.localParticipant) return;
        await this.room.localParticipant.setMicrophoneEnabled(true).catch(()=>{});
    }


    isMuted() {
        return !this._micEnabled();
    }

    async toggleMic() {
        if (!this.room?.localParticipant) return;
        const nextEnabled = this.isMuted();
        await this.room.localParticipant.setMicrophoneEnabled(nextEnabled);
        return nextEnabled;
    }

    async leaveRoom() {
        if (this.room?.localParticipant) {
            if (this.onLeave) this.onLeave(this.room.localParticipant.identity);
            await this.room.disconnect();
        }
    }
}
