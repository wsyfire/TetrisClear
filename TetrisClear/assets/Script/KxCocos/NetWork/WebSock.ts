import { ISocket, NetData } from "./NetNode";

/*
*   WebSocket封装
*   1. 连接/断开相关接口
*   2. 网络异常回调
*   3. 数据发送与接收
*   
*   2018-5-14 by 宝爷
*/

export class WebSock implements ISocket {
    private _ws: WebSocket = null;              // websocket对象
    private _isBinaryType: boolean = true;      // true为二进制传输，false为文本传输

    onConnected: (event) => void = null;
    onMessage: (msg) => void = null;
    onError: (event) => void = null;
    onClosed: (event) => void = null;

    connect(ip: string, port: number, isSSL: boolean = false) {
        let url = isSSL ? "ws://" + ip + ":" + port 
                        : "wss" + ip + ":" + port;
        let binaryTypeStr = this._isBinaryType ? "arraybuffer" : "blob";
        if (this._ws) {
            if (this._ws.readyState === WebSocket.CONNECTING && this._ws.url == url) {
                console.log("websocket connecting, wait for a moment...")
                return;
            } else {
                this._ws.onmessage = null;
                this._ws.onclose = null;
                this._ws.onerror = null;
                this._ws.onopen = null;
                console.log("should unbind websocket callback");
            }
        }

        this._ws = new WebSocket(url);
        this._ws.binaryType = binaryTypeStr;
        this._ws.onmessage = (event) => {
            this.onMessage(event.data);
        };
        this._ws.onopen = this.onConnected;
        this._ws.onerror = this.onError;
        this._ws.onclose = this.onClosed;
    }

    send(buffer: NetData) {
        this._ws.send(buffer);
    }

    close(code?: number, reason?: string) {
        this._ws.close();
    }
}