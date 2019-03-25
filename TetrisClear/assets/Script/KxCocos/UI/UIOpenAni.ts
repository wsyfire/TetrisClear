/*******************************************************************
** 创建人:  litao
** 日  期:  2018-1-0 00:00
** 版  本:  1.0
** 描  述:  
** 应  用:  
********************************************************************/
const { ccclass, property } = cc._decorator;

@ccclass("COpenAniObject")
class COpenAniObject {
    @property(cc.AnimationClip)
    clip: cc.AnimationClip = null;

    @property(cc.Node)
    clipNode : cc.Node = null;
}

@ccclass
class CUIOpenAni extends cc.Component {

    @property({ type: [COpenAniObject]})
    animations:COpenAniObject[]  = [];

    private playAniCount = 0;
    private callFunc: ()=>void = null;

    play(callFunc: ()=>void) {
        let immediateCallback = true;
        this.playAniCount = 0;
        this.callFunc = callFunc;

        // 先全部隐藏
        for(let i = 0; i < this.animations.length; ++i){
            let info = this.animations[i];
            info.clipNode = info.clipNode || this.node;
            info.clipNode.active = false;
        }
        
        // 如果不延迟播放那个动画，会对适配造成影响
        console.time("loadplayopenani");
        if (this.animations.length > 0) {
            this.scheduleOnce(()=>{
                console.timeEnd("loadplayopenani");
                for(let i = 0; i < this.animations.length; ++i){
                    let info = this.animations[i];
                    info.clipNode = info.clipNode || this.node;
                    if(!info.clip) {
                        info.clipNode.active = true;
                        continue;
                    }
                    
                    let widgetCom = info.clipNode.getComponent(cc.Widget);
                    widgetCom && widgetCom.updateAlignment();
                    let animation = info.clipNode.getComponent(cc.Animation);
                    if(!animation) {
                        animation = info.clipNode.addComponent(cc.Animation);
                    }
    
                    let isExit = false;
                    let clips = animation.getClips();
                    for (let j = 0; j < clips.length; j++) {
                        if (clips[j].name == info.clip.name) {
                            isExit = true;
                            break;
                        }                    
                    }
    
                    if (!isExit) {
                        animation.addClip(info.clip);
                    }
                    
                    let state: cc.AnimationState = animation.play(info.clip.name);
                    info.clipNode.active = true;
                    if (null == state) {
                        continue;
                    }
                    // 如果界面默认是1倍大小，播放uiOpen动画会先一瞬间的缩小后放大，造成不正常的显示
                    if (info.clip.name == "uiOpen") {
                        info.clipNode.opacity = 0;
                    }

                    ++this.playAniCount;
                    immediateCallback = false;
                    animation.once("finished", this.onAniFinished, this);
                }
                if (immediateCallback && this.callFunc) {
                    this.callFunc();
                }
            }, 0);
        }else {
            this.callFunc();
        }
    }

    private onAniFinished() {        
        --this.playAniCount;
        if (this.playAniCount == 0 && this.callFunc) {
            this.callFunc();
        }
    }
}

export {COpenAniObject, CUIOpenAni}
