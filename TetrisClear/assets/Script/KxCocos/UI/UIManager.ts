import { UIID, UIPrefab } from '../Config/UIConfig'
import { UIView, UIShowTypes, UIOpenAnimation } from './UIView'
import { COpenAniObject, CUIOpenAni } from './UIOpenAni'
import CUICloseAni from './UICloseAni'
import ResLoader from '../ResLoader';
import { EventManager } from '../EventManager';
import { kxEvents } from '../Config/KxEvents';

interface UIInfo {
    uiId: number;
    uiView: UIView;
    uiArgs: any;
    preventNode?: cc.Node;
    zOrder?: number;
    openType?: 'quiet' | 'other';
    isClose?: boolean;
    ResToClear?: string[];
    ResCache?: string[];
}

/**
 ** 创建人: liaozhiqiang (2015-10-30 by 宝爷)
 ** 日  期: 2018-1-22 19:36
 ** 版  本: 1.0
 ** 描  述: 
    UIManager用于管理UI，依赖于C++导出的ResManager
	1.打开界面，根据配置自动加载界面、调用初始化、播放打开动画、隐藏其他界面、屏蔽下方界面点击
	2.关闭界面，根据配置自动关闭界面、播放关闭动画、恢复其他界面
	3.切换界面，同打开界面，但是是将当前栈顶的界面进行切换，而不是压入一个新的
	4.界面Cache缓存
    
    1.新增UI回调
    2.新增UI栈保存与恢复
    4.分离具体配置项

    依赖 ResManager
 ** 应  用: 
*/
class CUIManager {
    /** 背景UI（有若干层UI是作为背景UI，而不受切换等影响）*/
    private BackGroundUI = 0;
    /** 是否保存了UI */
    private isSaveUI = false;
    /** 是否正在关闭UI */
    private isClosing = false;
    /** 是否正在打开UI */
    private isOpening = false;
    /** 是否正在重建UI */
    private isBuilding = false;

    /** UI界面缓存（key为UIId，value为UIView节点）*/
    private UICache: { [UIId: number]: UIView } = {};
    /** UI界面栈（{UIID + UIView + UIArgs}数组）*/
    private UIStack: UIInfo[] = [];
    /** UI界面栈缓存，用于场景切换后恢复界面 */
    private UIStackCache: UIInfo[] = [];
    /** UI待打开列表 */
    private UIOpenQueue: UIInfo[] = [];
    /** UI待关闭列表 */
    private UICloseQueue: UIView[] = [];

    /** UI打开前回调 */
    public uiOpenBeforeDelegate: (uiId: UIID, preUIId: UIID) => void = null;
    /** UI打开回调 */
    public uiOpenDelegate: (uiId: UIID, preUIId: UIID) => void = null;
    /** UI关闭回调 */
    public uiCloseDelegate: (uiId: UIID) => void = null;

    private static instance: CUIManager = null;
    public static getInstance(): CUIManager {
        if (!this.instance) {
            this.instance = new CUIManager();
        }
        return this.instance;
    }

    public static destroy(): void {
        if (this.instance) {
            delete this.instance;
            this.instance = null;
        }
    }

    private constructor() {
        // 构造函数h
    }

    /** 清理界面缓存 */
    public clearCache(): void {
        for (const key in this.UICache) {
            let node = this.UICache[key].node;
            if (cc.isValid(node)) {
                cc.log('--------------------1');
                let uiView = node.getComponent(UIView);
                if (cc.isValid(uiView)) {
                    uiView.releaseAutoRes();
                }
                node.destroy();
            }
        }
        this.UICache = {};
    }

    /** 根据界面数据刷新显示(endIndex: 为0的时候会重新刷新一遍显示的模式) */
    updateUI(endIndex?: number) {
        if (null == endIndex || undefined == endIndex) {
            endIndex = this.UIStack.length - 1;
        }
        if (endIndex >= this.UIStack.length) {
            return;
        }

        let beginIndex = this.BackGroundUI;
        let mode = this.UIStack[endIndex].uiView.showType;

        this.UIStack[endIndex].uiView.node.active = true;

        if (UIShowTypes.addition == mode) {
            // 叠加模式不处理
            this.updateUI(++endIndex);
            return;

        } else if (UIShowTypes.fullScreen == mode) {
            // 全屏模式全部隐藏
            beginIndex = 0;

        } else if (UIShowTypes.single == mode) {
            // single模式，只显示背景和自己
            for (let i = 0; i < this.BackGroundUI; ++i) {
                if (this.UIStack[i]) {
                    this.UIStack[i].uiView.node.active = true;
                }
            }
        }

        for (let j = beginIndex; j < endIndex; ++j) {
            let uiInfo = this.UIStack[j];
            if (uiInfo.uiView && endIndex >= uiInfo.uiView.node.zIndex) {
                this.UIStack[j].uiView.node.active = false;
            }
        }

        this.updateUI(++endIndex);
    }

    /** 添加防触摸层 */
    private preventTouch(zOrder: number) {
        let node = new cc.Node()
        node.name = 'preventTouch';
        node.setContentSize(cc.view.getVisibleSize());
        node.on(cc.Node.EventType.TOUCH_START, function (event: cc.Event.EventCustom) {
            event.stopPropagation();
        }, node);
        let child = cc.director.getScene().getChildByName('Canvas');
        child.addChild(node, zOrder);
        return node;
    }

    /** 打开UI时，使TopUIzorder提到当前UI上层 */
    private openTopUI(topUIId?: UIID, zOrder?: number) {
        if (null == topUIId || UIID.UINone == topUIId) {
            return;
        }

        // 查询改UI是否已经打开，有打开修改zorder，没有就直接打开
        let isNeedOpen = false;
        let index = this.getUIIndex(topUIId);
        if (-1 == index) {
            // 没有打开，直接打开
            isNeedOpen = true
        } else {
            // 修改zorder
            let uiInfo = this.UIStack[index]
            if (null != uiInfo && uiInfo.uiView) {
                uiInfo.uiView.node.zIndex = (zOrder ? zOrder : this.UIStack.length) + 1;
            } else {
                isNeedOpen = true;
            }
        }
        if (isNeedOpen) {
            this.open(topUIId, null);
        }
    }

    /** 关闭UI后，使topUI的zOrder变回去 */
    private closeTopUI(topUIId?: UIID) {
        if (null == topUIId || UIID.UINone == topUIId) {
            return;
        }

        let index = this.getUIIndex(topUIId);
        if (-1 != index) {
            let uiInfo = this.UIStack[index]
            if (uiInfo && uiInfo.uiView && uiInfo.zOrder) {
                uiInfo.uiView.node.zIndex = uiInfo.zOrder;
            }
        }
    }

    /** 打开UI*/
    private openUI(uiId: number, uiView: UIView, uiInfo: UIInfo, uiArgs: any) {
        if (null == uiView) {
            return;
        }
        cc.log("openUI uiId:" + uiId + " UIName:" + UIID[uiId]);

        // 存入界面栈信息结构
        uiInfo.uiView = uiView;
        uiView.uiId = uiId;
        uiView.node.active = true;
        uiView.node.zIndex = uiInfo.zOrder ? uiInfo.zOrder : this.UIStack.length

        if (uiView.quickClose) {
            let uiBg = uiView.node.getChildByName('background');
            if (uiBg) {
                uiBg.targetOff(cc.Node.EventType.TOUCH_START);
                uiBg.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventCustom) => {
                    event.stopPropagation();
                    this.close(uiView);
                }, uiBg);
            } else {
                cc.log("error, openUI quickClose by background is null uiid:" + uiInfo.uiId);
            }
        }

        // 设置topUI
        this.openTopUI(uiView.topUI, uiInfo.zOrder);

        // 添加到场景
        let child = cc.director.getScene().getChildByName('Canvas');

        console.time("loaduiopenaddchild|" + UIID[uiId]);
        // if(uiId==UIID.UIHall){
        //     let node = new cc.Node();
        //     console.time("loaduiopentestaddchild|"+ UIID[uiId]);
        //     node.addChild(uiView.node)
        //     console.timeEnd("loaduiopentestaddchild|"+ UIID[uiId]);
        //     child.addChild(node);
        // }else{
        child.addChild(uiView.node);
        // }

        console.timeEnd("loaduiopenaddchild|" + UIID[uiId]);
        // 刷新其他UI
        this.updateUI();

        // 从那个界面打开的
        let fromUIID: UIID = UIID.UINone;
        if (this.UIStack.length > 1) {
            fromUIID = this.UIStack[this.UIStack.length - 2].uiId
        }

        // 打开界面之前回调
        if (this.uiOpenBeforeDelegate) {
            this.uiOpenBeforeDelegate(uiId, fromUIID);
        }

        cc.log("uiView.onOpen uiId:" + uiId + " UIName:" + UIID[uiId]);
        // 执行onOpen回调
        uiView.onOpen(fromUIID, uiArgs);
        EventManager.raiseEvent(kxEvents.EventOpenUI, { uiName: UIID[uiId], uiId: uiId });
        // 播放动画完成回调
        let openCallback = () => {
            cc.log("uiView.onOpenAniOver uiId:" + uiId + " UIName:" + UIID[uiId]);
            uiView.onOpenAniOver();
            if (this.uiOpenDelegate) {
                this.uiOpenDelegate(uiId, fromUIID);
            }
            
            EventManager.raiseEvent(kxEvents.EventOpenUIAni, { uiName: UIID[uiId], uiId: uiId });
        }

        // 执行动画
        let uiOpenAni: CUIOpenAni = uiView.getComponent("UIOpenAni");
        if (uiOpenAni) {
            uiOpenAni.play(openCallback);
        } else {
            openCallback();
        }
    }

    /** 预备UI资源 */
    private prepareUIRes(uiId: UIID, finishCallBack: () => void, loadingCallBack: (path: string, result: boolean) => void): string[] {
        finishCallBack();
        return [];
    }


    /** 因为加载是异步的，所以由以前的直接返回UIView改成调用回调函数返回UIView */
    private getOrCreateUI(uiId: UIID, completeCallback: (uiView: UIView) => void, uiArgs: any): void {
        let uiView: UIView = this.UICache[uiId];
        if (uiView) {
            completeCallback(uiView);
            return;
        }

        let uiPath = UIPrefab[uiId];
        if (null == uiPath) {
            cc.log('error, getOrCreateUI uiPath is null uiId:' + uiId + ' UIName:' + UIID[uiId]);
            completeCallback(null);
            return;
        }
        cc.log(uiPath);

        console.time("loadui|" + UIID[uiId]);

        let userStr = this.makeResUseStr(uiId);
        ResLoader.getInstance().loadRes(uiPath, cc.Prefab, (err: Error, prefab: cc.Prefab) => {
            console.timeEnd("loadui|" + UIID[uiId]);
            if (err) {
                cc.log('error, getOrCreateUI loadRes fail ' + uiPath + ' ' + err.message);
                completeCallback(null);
                return null;
            }

            console.time("loadui-instantiate|" + UIID[uiId]);
            let uiNode: cc.Node;
            uiNode = cc.instantiate(prefab);
            console.timeEnd("loadui-instantiate|" + UIID[uiId]);

            if (null == uiNode) {
                cc.log('error, getOrCreateUI instantiate fail ' + uiPath);
                completeCallback(null);
                ResLoader.getInstance().releaseRes(uiPath, cc.Prefab);
                return null;
            }
            uiView = uiNode.getComponent(UIView);
            if (null == uiView) {
                cc.log('error, getOrCreateUI getComponent ');
                uiNode.destroy();
                completeCallback(null);
                ResLoader.getInstance().releaseRes(uiPath, cc.Prefab);
                return null;
            }
            uiView.init(uiArgs);
            EventManager.raiseEvent(kxEvents.EventInitUI, { ui: UIID[uiId], uiId: uiId });
            uiView.name = this.getFileNmae(uiPath);
            completeCallback(uiView);

            uiView.pushAutoReleaseRes({ url: uiPath, type: cc.Prefab, use: userStr });

        }, userStr)


    }

    private static uiUseOrder = 0;
    private makeResUseStr(uiid: UIID) {
        return ResLoader.makeUseKey("uimanager", UIID[uiid], "uiopen_" + (++CUIManager.uiUseOrder));
    }

    /** 打开界面并添加到界面栈中 */
    public open(uiId: UIID, uiArgs: any): void {
        if (this.isOpening || this.isClosing) {
            // 插入待打开队列
            this.UIOpenQueue.push({
                uiId: uiId,
                uiArgs: uiArgs,
                uiView: null
            })
            return;
        }
        console.time("loaduiopen|" + UIID[uiId]);
        let uiIndex = this.getUIIndex(uiId);
        if (-1 != uiIndex) {
            // 重复打开了同一个界面，直接回到该界面
            this.closeToUI(uiId, uiArgs);
            return;
        }

        // 设置UI的zOrder
        let zOrder = this.UIStack.length + 1;
        let uiInfo: UIInfo = {
            uiId: uiId,
            zOrder: zOrder,
            uiArgs: uiArgs,
            uiView: null
        }
        this.UIStack.push(uiInfo);

        // 先屏蔽点击
        uiInfo.preventNode = this.preventTouch(zOrder);

        // 预加载资源，并在资源加载完成后自动打开界面
        let callback = () => {
            // console.timeEnd("loaduiopen|"+ UIID[uiId]);
            this.getOrCreateUI(uiId, (uiView: UIView): void => {
                if (uiInfo.isClose) {
                    this.isOpening = false;
                    cc.log('--------------------2');
                    uiInfo.preventNode.destroy();
                    uiInfo.preventNode = null;
                    return;
                }
                // console.timeEnd("loaduiopen|"+ UIID[uiId]);
                if (null == uiView) {
                    this.isOpening = false;
                    cc.log('--------------------3');
                    uiInfo.preventNode.destroy();
                    uiInfo.preventNode = null;
                    this.UIStack.pop();
                    cc.log('error, getOrCreateUI return null ' + uiId);
                    return;
                }

                // 根据配置处理屏蔽层
                if (!uiView.preventTouch) {
                    cc.log('--------------------4');
                    uiInfo.preventNode.destroy();
                    uiInfo.preventNode = null;
                }

                let openUI = () => {
                    // 打开UI，执行配置
                    this.openUI(uiId, uiView, uiInfo, uiArgs);
                    this.isOpening = false;
                    console.timeEnd("loaduiopen|" + UIID[uiId]);

                    this.processQueueUI();
                }

                openUI();

            }, uiArgs)
        }

        this.isOpening = true;
        uiInfo.ResToClear = this.prepareUIRes(uiId, callback, () => { })
    }

    public openQuiet(uiId, openCallback: () => void, uiArgs: any) {
        let uiIndex = this.getUIIndex(uiId);
        if (-1 != uiIndex) {
            // 重复打开了同一个界面，直接回到该界面
            this.closeToUI(uiId, uiArgs);
            return;
        }

        // 设置UI的zOrder
        let zOrder = this.UIStack.length + 1;
        let uiInfo: UIInfo = {
            uiId: uiId,
            zOrder: zOrder,
            uiArgs: uiArgs,
            uiView: null
        }
        this.UIStack.push(uiInfo);

        // 先屏蔽点击
        uiInfo.preventNode = this.preventTouch(zOrder);

        let callback = () => {
            this.getOrCreateUI(uiId, (uiView: UIView): void => {
                if (uiInfo.isClose) {
                    cc.log('--------------------5');
                    uiInfo.preventNode.destroy();
                    uiInfo.preventNode = null;
                    return;
                }
                if (null == uiView || uiInfo.isClose) {
                    cc.log('error, getOrCreateUI return null or ui isClose uiId:' + uiId + ' UIName:' + UIID[uiId] + ' isClose' + uiInfo.isClose);
                    uiInfo.preventNode.destroy();
                    uiInfo.preventNode = null;
                    return;
                }

                // 根据配置处理屏蔽层
                if (!uiView.preventTouch || uiInfo.isClose) {
                    cc.log('--------------------6');
                    uiInfo.preventNode.destroy();
                    uiInfo.preventNode = null;
                }

                if (uiView.quickClose) {
                    let uiBg = uiView.node.getChildByName('background');
                    if (uiBg) {
                        uiBg.targetOff(cc.Node.EventType.TOUCH_START);
                        uiBg.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventCustom) => {
                            event.stopPropagation();
                            this.close(uiView);
                        }, uiBg);
                    } else {
                        cc.log("error, openUI quickClose by background is null");
                    }
                }

                let oldState = this.isBuilding;
                this.isBuilding = true;
                this.openUI(uiId, uiView, uiInfo, uiArgs);
                this.isBuilding = oldState;
                if (openCallback) {
                    openCallback()
                }
            }, uiArgs);
        }

        uiInfo.ResToClear = this.prepareUIRes(uiId, callback, null)
    }

    /** 替换栈顶界面 */
    public replace(uiId: UIID, uiArgs: any) {
        this.close(this.UIStack[this.UIStack.length - 1].uiView);
        this.open(uiId, uiArgs);
    }

    /** 关闭当前界面 */
    public close(closeUI: UIView) {
        let uiCount = this.UIStack.length;
        if (uiCount < 1 || this.isClosing || this.isOpening) {
            if (closeUI) {
                // 插入待关闭队列
                this.UICloseQueue.push(closeUI);
            }
            return;
        }

        let uiInfo: UIInfo;
        if (closeUI) {
            for (let index = this.UIStack.length - 1; index >= 0; index--) {
                let ui = this.UIStack[index];
                if (ui.uiView === closeUI) {
                    uiInfo = ui;
                    this.UIStack.splice(index, 1);
                    break;
                }
            }
            if (typeof (uiInfo) === "undefined") {
                this.processQueueUI();
                return;
            }
        } else {
            uiInfo = this.UIStack.pop();
        }

        // 关闭当前界面
        //let uiInfo = this.UIStack.pop();
        let uiId = uiInfo.uiId;
        let uiView = uiInfo.uiView;
        uiInfo.isClose = true;
        cc.log('close ui ' + uiId + ' ' + UIID[uiId]);

        if (null == uiView) {
            this.processQueueUI();
            return;
        }

        let preUIInfo = this.UIStack[uiCount - 2];
        // 处理显示模式
        this.updateUI(0);
        let close = () => {
            this.isClosing = false;
            // 显示之前的界面
            if (preUIInfo && preUIInfo.uiView && this.isTopUI(preUIInfo.uiId)) {
                // 如果之前的界面弹到了最上方（中间有肯能打开了其他界面）
                preUIInfo.uiView.node.active = true
                // 回调onTop
                preUIInfo.uiView.onTop(uiId, uiView.onClose());
                // 设置topUI
                this.openTopUI(preUIInfo.uiView.topUI, preUIInfo.zOrder);
            } else {
                uiView.onClose();
            }

            if (this.uiCloseDelegate) {
                this.uiCloseDelegate(uiId);
            }
            EventManager.raiseEvent(kxEvents.EventCloseUIAni, { ui: UIID[uiId], uiId: uiId });
            if (uiView.cache) {
                this.UICache[uiId] = uiView;
                uiView.node.removeFromParent(false);
                cc.log(`uiView removeFromParent ${uiInfo.uiId}`);
            } else {
                uiView.releaseAutoRes();
                uiView.node.destroy();
                cc.log(`uiView destroy ${uiInfo.uiId}`);
            }

            if (uiInfo.ResToClear) {
                for (const iterator of uiInfo.ResToClear) {
                    // ...
                }
            }

            // 回收遮罩层
            if (uiInfo.preventNode) {
                cc.log('--------------------7');
                uiInfo.preventNode.destroy();
                uiInfo.preventNode = null;
            }

            this.processQueueUI();
        }

        let closeUIFunc = () => {

            // 处理topUI
            this.closeTopUI(uiInfo.uiView.topUI);

            this.isClosing = true;
            EventManager.raiseEvent(kxEvents.EventCloseUI, { ui: UIID[uiId], uiId: uiId });
            // 执行动画
            let uiCloseAni: CUICloseAni = uiView.getComponent("UICloseAni");
            if (uiCloseAni) {
                uiCloseAni.play(close);
            } else {
                close();
            }
        }

        closeUIFunc();
    }

    // 自动打开下一个待打开/待关闭的界面
    private processQueueUI() {
        if (this.UICloseQueue.length > 0) {
            let uiQueueInfo = this.UICloseQueue[0];
            this.UICloseQueue.splice(0, 1);
            this.close(uiQueueInfo);
        } else if (this.UIOpenQueue.length > 0) {
            let uiQueueInfo = this.UIOpenQueue[0];
            this.UIOpenQueue.splice(0, 1);
            this.open(uiQueueInfo.uiId, uiQueueInfo.uiArgs);
        }
    }

    //直接关闭界面列表
    directlyCloseArray() {

    }

    /** 关闭所有界面 */
    public closeAll() {
        // 不播放动画，也不清理缓存
        for (const uiInfo of this.UIStack) {
            uiInfo.isClose = true;
            if (uiInfo.uiView) {
                uiInfo.uiView.onClose();
                cc.log('--------------------9');
                uiInfo.uiView.releaseAutoRes();
                uiInfo.uiView.node.destroy();
            }
            if (uiInfo.preventNode) {
                cc.log('--------------------10');
                uiInfo.preventNode.destroy();
                uiInfo.preventNode = null;
            }
        }
        this.UIOpenQueue = [];
        this.UICloseQueue = [];
        this.isOpening = false;
        this.UIStack = [];
        this.isClosing = false;
    }

    public closeToUI(uiId: UIID, uiArgs: any, bOpenSelf = true): void {
        let idx = this.getUIIndex(uiId);
        if (-1 == idx) {
            return;
        }

        idx = bOpenSelf ? idx : idx + 1;
        for (let i = this.UIStack.length - 1; i >= idx; --i) {
            let uiInfo = this.UIStack.pop();
            let uiId = uiInfo.uiId;
            let uiView = uiInfo.uiView;
            uiInfo.isClose = true

            // 回收屏蔽层
            if (uiInfo.preventNode) {
                cc.log('--------------------11');
                uiInfo.preventNode.destroy();
                uiInfo.preventNode = null;
            }

            if (this.uiCloseDelegate) {
                this.uiCloseDelegate(uiId);
            }

            if (uiView) {
                uiView.onClose()
                if (uiView.cache) {
                    this.UICache[uiId] = uiView;
                    uiView.node.removeFromParent(false);
                } else {
                    uiView.node.destroy();
                }

                if (uiInfo.ResToClear && !uiView.cache) {
                    // ......
                }

                // 处理topUI
                this.closeTopUI(uiView.topUI)
            }
        }

        this.updateUI(0);
        this.UIOpenQueue = [];
        this.UICloseQueue = [];
        bOpenSelf && this.open(uiId, uiArgs);
    }

    public isTopUI(uiId) {
        if (this.UIStack.length == 0) {
            return false;
        }
        return this.UIStack[this.UIStack.length - 1].uiId == uiId;
    }

    public getUIID(idx: number) {
        if (this.UIStack.length <= idx) {
            return false;
        }
        return this.UIStack[this.UIStack.length - idx - 1].uiId;
    }

    public getUI(uiId: UIID) {
        for (let index = 0; index < this.UIStack.length; index++) {
            const element = this.UIStack[index];
            if (uiId == element.uiId) {
                return element.uiView;
            }
        }
        return null;
    }

    public getUIinCache(uiid: UIID) {
        if (cc.isValid(this.UICache[uiid])) {
            return this.UICache[uiid];
        } else {
            return null;
        }
    }

    public getTopUI() {
        if (this.UIStack.length > 0) {
            return this.UIStack[this.UIStack.length].uiView;
        } else {
            return null;
        }
    }

    public getUIIndex(uiId: UIID) {
        for (let index = 0; index < this.UIStack.length; index++) {
            const element = this.UIStack[index];
            if (uiId == element.uiId) {
                return index;
            }
        }
        return -1;
    }

    public hasSave() {
        return this.isSaveUI;
    }

    public saveUI(popCount: number, openType: string) {
        let count = this.UIStack.length - popCount;
        if (count < 1) {
            cc.log("error, save UI larger, UIStack:" + this.UIStack.length + " popCount:" + popCount);
            return;
        }
        this.UIStackCache = [];

        for (let i = 0; i < count; i++) {
            let uiInfo = this.UIStack[i];
            this.UIStackCache.push({
                uiId: uiInfo.uiId,
                uiArgs: uiInfo.uiArgs,
                openType: uiInfo.openType,
                uiView: uiInfo.uiView
            });
        }
        this.isSaveUI = true;
    }

    public popUI(popCount: number = 1) {
        if (popCount >= this.UIStackCache.length) {
            popCount = this.UIStackCache.length;
        }
        this.UIStackCache.splice(-popCount, popCount);
    }

    /** 保存当前UI栈从栈底到指定UI */
    public saveToLastUI(uiId: UIID, openType: string) {
        // 计算出到指定UI所需弹出的UI界面数量
        let count = this.UIStackCache.length;
        let popCount = 0;
        for (let i = count - 1; i >= 0; --i) {
            if (this.UIStackCache[i].uiId == uiId) {
                popCount = count - i - 1;
                break;
            }
        }
        this.saveUI(popCount, openType);
    }

    public buildSaveUI(uiStackCache: UIInfo[]) {
        this.UIStackCache = uiStackCache;
        this.isSaveUI = true;
    }

    /** 
    ** 在保存的UI界面中追加一个界面到最顶部 
    ** 传入UI，打开类型，界面参数 */
    public pushSaveUI(uiId: UIID, openType: 'quiet' | 'other', uiArgs: any) {
        this.UIStackCache.push({
            uiId: uiId,
            uiArgs: uiArgs,
            openType: openType,
            uiView: null
        })
        this.isSaveUI = true;
    }

    public clearSaveUI() {
        this.UIStackCache = [];
        this.isSaveUI = false;
    }

    public preLoadUI(loadingCallback: () => void) {
        loadingCallback();
        // .... 
    }

    public loadUI() {
        let loadCount = this.UIStackCache.length;
        if (loadCount == 0) {
            return;
        }

        // 先强制关闭所有UI
        this.closeAll();

        // 加载完资源后依次打开界面
        for (let i = 0; i < loadCount; ++i) {
            let uiInfo = this.UIStackCache[i];
            let openCallback: any = this.openQuiet
            if (i == loadCount && uiInfo.openType != "quiet") {
                openCallback = this.open;
            }
            if (openCallback != this.openQuiet) {
                this.isBuilding = false;
                openCallback(uiInfo.uiId, uiInfo.uiArgs);
            } else {
                this.isBuilding = true;
                openCallback(uiInfo.uiId, null, uiInfo.uiArgs);
            }
            this.UIStack[i].ResToClear = this.UIStackCache[i].ResCache;
        }
        this.isBuilding = false;
        this.UIStackCache = [];
        this.isSaveUI = false;
    }

    private getFileNmae(path: string): string {
        let beginIndex1 = path.lastIndexOf('/');
        let beginIndex2 = path.lastIndexOf('\\');
        return path.substring((beginIndex1 > beginIndex2 ? beginIndex1 : beginIndex2) + 1, path.lastIndexOf('.'));
    }

    /**获取UIStack的长度 */
    public getUIStackLength() {
        return this.UIStack.length;
    }
}

export let UIManager = CUIManager.getInstance();