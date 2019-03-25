import { UIID } from "../Config/UIConfig";
import ResLoader, { CompletedCallback } from "../ResLoader";


/*
interface UIConfigType {

    closeAni?: string; //界面的关闭动画名字符串
    openAni?:string; //界面的打开动画名字符串
	cache?: boolean; //界面是否缓存（再次打开直接使用缓存，但无法被重复打开！）
    preventTouch?: boolean;//是否屏蔽背后UI的点击
    showType?: "fullScreen"|"addition"|"single";//UI显示类型 默认为single只显示当前栈顶界面 + 背景
                                                //addition 叠加模式，ui栈中所有界面顺序显示
                                                //fullScreen则只显示当前界面    
    quickClose?: boolean;//快速关闭（点击背后的UI时）
    resolutionNode?:string; //分辨率适配节点（执行dolayout）
    topUI?:UIID;//需要将哪个UI置顶
}*/

enum UIShowTypes {
    fullScreen,     // fullScreen则只显示当前界面
    addition,       // addition则显示所有界面
    single          // single只显示当前栈顶界面 + 背景
}

export enum UIOpenAnimation {
    NONE,
    CLOUD,
}

interface autoReleaseResConf { url: string; type: typeof cc.Asset; use: string };


const { ccclass, property } = cc._decorator;

@ccclass
export default class UIView extends cc.Component {
    @property
    preventTouch: boolean = true;

    @property
    cache: boolean = false;

    @property
    quickClose: boolean = false;

    @property({
        type: cc.Enum(UIShowTypes)
    })
    showType: UIShowTypes = UIShowTypes.addition;

    @property({
        type: cc.Enum(UIOpenAnimation)
    })
    uiOpenAnimatin: UIOpenAnimation = UIOpenAnimation.NONE;

    @property({
        type: cc.Enum(UIID)
    })
    topUI: UIID = UIID.UINone;

    //-- 当界面被创建时回调
    //-- 只初始化一次
    public init(uiArgs: any): void {

    }
    //-- 当界面被打开时回调
    //-- 每次调用Open时回调
    public onOpen(fromUIID: UIID, uiArgs: any): void {

    }

    //每次界面Open动画播放完毕时回调
    public onOpenAniOver(): void {

    }

    //当界面被关闭时回调
    //每次调用Close时回调
    //可以返回多个数据
    public onClose(): any {

    }
    //  当界面被置顶时回调
    //Open时并不会回调该函数
    public onTop(preUIID: UIID, uiArgs: any): void {

    }

    public static loadTime = 0;
    private autoReleaseResources: autoReleaseResConf[] = [];
    /**
     * 
     * @param url 要加载的url
     * @param type 类型，如cc.Prefab,cc.SpriteFrame,cc.Texture2D
     * @param onCompleted 
     */
    public loadRes(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback) {

        let UseStr = ResLoader.makeUseKey("UI", "UIView", "loadRes_"+ (++UIView.loadTime));
        ResLoader.getInstance().loadRes(url, type, (error: Error, res) => {
            if (!error) {
                if(cc.isValid(this)){
                    this.autoReleaseResources.push({ url: url, type: type, use: UseStr });
                }           
            }
            onCompleted && onCompleted(error, res);
        }, UseStr);
    }

    /**
     * 这个函数应该在node被释放的时候调用。
     */
    public releaseAutoRes() {
        for (let index = 0; index < this.autoReleaseResources.length; index++) {
            const element = this.autoReleaseResources[index];
            ResLoader.getInstance().releaseRes(element.url, element.type, element.use);
        }
    }

    /**
     * 往一个界面加入一个自动释放的资源
     * @param resConf 资源url和类型
     */
    public pushAutoReleaseRes(resConf: autoReleaseResConf) {
        this.autoReleaseResources.push(resConf);
    }

    /** 当前界面的UIID */
    uiId: UIID = UIID.UINone;
}

export { UIShowTypes, UIView }