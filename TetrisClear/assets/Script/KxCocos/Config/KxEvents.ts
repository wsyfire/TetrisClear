/**
 ** 创建人: wusuiyong
 ** 日  期: 2019-3-23 00:00
 ** 版  本: 1.0
 ** 描  述:
    定义了游戏中的ui打开关闭等事件，并声明了事件对应会传入的参数
	事件触发时会将参数封装到table中，table中各个字段的含义如下【如无特殊申明，均为整数】
 ** 应  用:
*/
export const kxEvents = {
    // UI相关
    EventOpenUIBefore: "EventOpenUIBefore",                 // 打开UI前
    EventOpenUI: "EventOpenUI",                             // 打开UI
    EventCloseUI: "EventCloseUI",                           // 关闭UI
    EventChangeScene: "EventChangeScene",                   // 场景切换
    EventBeforeOpenUI: "EventBeforeOpenUI",                 // 场景切换后，初始化ui前
    EventOpenUIAni: "OpenUIAni",                            // UI打开动画播放完以后
    EventCloseUIAni: "CloseUIAni",                          // UI关闭动画播放完后
    EventInitUI: "EventInitUI",                             // 初始化ui

    // 系统事件
    EventNetConnect: "NetConnect",   				        // 网络连接
    EventNetDisconnect: "NetDisconnect",     		        // 网络断开
    EventNetReconnect: "NetReconnect",       		        // 网络重新连接
    EventNetOnMessage: "EventNetOnMessage",
}