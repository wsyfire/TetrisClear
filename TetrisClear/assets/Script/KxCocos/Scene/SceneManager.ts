import {SceneID,SceneName,SceneConfig} from "../Config/SceneConfig";
import {UIManager} from "../UI/UIManager"
import { EventManager } from "../EventManager";
import { kxEvents } from "../Config/KxEvents";

export default class CSceneManager {
    private static _manager : CSceneManager = null;
    public static getInstance(): CSceneManager {
        if (!this._manager) {
            this._manager = new CSceneManager();
        }
        return this._manager;
    }

    public static destroy(): void {
        if (this._manager) {
            this._manager = null;
        }
    }

    private  constructor(){

    }
    private PrevScene = SceneID.SceneNone;
    private CurScene = SceneID.SceneNone;
    private ChangeSceneDelegate:()=>void = null;
    public setChangeSceneDelegate(f){
        this.ChangeSceneDelegate = f;
    }


    // 直接切换场景（不带资源加载和清理）
    public changeScene(sceneId : SceneID,callback:Function):void{
        if(SceneName[sceneId]){
            cc.director.loadScene(SceneName[sceneId],callback);
        }else{
            cc.error("error sceneId :%d ,no file",SceneID);
        }
                 
    }

    // 自动切换场景
    public loadScene(sceneId : SceneID,callback:()=>void):void{
        cc.log("loadScene:"+sceneId);
        let sceneCfg = SceneConfig[sceneId];
        if(!sceneCfg){
            cc.error("error sceneId %d,do not find config",sceneId);
            return
        }

        let wrapCallback = ()=>{
            EventManager.raiseEvent(kxEvents.EventBeforeOpenUI)
            this.PrevScene = this.CurScene;
            this.CurScene = sceneId;
            if(sceneCfg.defaultUIID){
                if(typeof(sceneCfg.defaultUIID) == "number"){
                    UIManager.open(sceneCfg.defaultUIID,null);
                }else if(typeof sceneCfg.defaultUIID == "object"){
                    for (const key in sceneCfg.defaultUIID) {
                            const ui = sceneCfg.defaultUIID[key];
                            UIManager.open(ui,null);
                    }
                }
                //todo 加载默认UI
                
            }
            callback && callback();
        }

        let startLoad = ()=>{
            //清理资源
            // ResManager.getInstance().clearRes();

            this.ChangeSceneDelegate && this.ChangeSceneDelegate();

            //ResManager.getInstance().addPreloadRes("",wrapCallback);

            this.changeScene(sceneId,wrapCallback);
        }

        //todo
        //-- 先关闭所有UI，清理UI缓存
        UIManager.closeAll();
        UIManager.clearCache();

        if(sceneCfg.loadingView){
            //this.changeScene(SceneID.SceneLoading,startLoad);
        }else{
            startLoad();
        }
    }
}

let SceneManager = CSceneManager.getInstance();
export {SceneManager}
