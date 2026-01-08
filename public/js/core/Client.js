function Client() {
    return window?.dcts
}

function isLauncher() {
    return !!Client()
}

function downloadClient(){
    openNewTab("https://github.com/hackthedev/dcts-client-shipping/releases/latest")
}

function openNewTab(url) {
    if (url.startsWith("data:")) {
        const blob = dataURLtoBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
    } else {
        window.open(url, "_blank");
    }
}

const TauriProxy = new Proxy({}, {
    get(target, prop) {
        return async (...args) => {
            if(!isLauncher()) return;

            let params = {};
            if (args.length === 1 && typeof args[0] === "object") {
                params = args[0];
            } else {
                args.forEach((a, i) => {
                    params["arg" + i] = a;
                });
            }
            
            return await window?.__TAURI__?.core?.invoke(prop?.toString(), params);
        };
    }
});
