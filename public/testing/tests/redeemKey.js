export function test(){
    socket.emit("redeemKey", {
        id: UserManager.getID(),
        token: UserManager.getToken()
    }, function (response) {
        console.log(response)
    })
}