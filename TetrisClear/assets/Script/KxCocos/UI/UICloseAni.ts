const {ccclass, property} = cc._decorator;

@ccclass("CCloseAniObject")
class CCloseAniObject {
    @property(cc.AnimationClip)
    clip: cc.AnimationClip = null;

    @property(cc.Node)
    clipNode : cc.Node = null;
}

/**
 ** 创建人: liaozhiqiang
 ** 日  期: 2018-2-0 00:00
 ** 版  本: 1.0
 ** 描  述: UIManager关闭动画
 ** 应  用: 
*/
@ccclass
export default class CUICloseAni extends cc.Component {
    @property({ type: [CCloseAniObject]})
    animations:CCloseAniObject[]  = [];

    private playAniCount = 0;
    private callFunc: ()=>void = null;

    /** 播放关闭动画，如果有全部播放完成后回调，如果没有动画，直接回调 */
    play(callFunc: ()=>void) {
        let immediateCallback = true;
        this.playAniCount = 0;
        this.callFunc = callFunc;

        if (this.animations.length > 0) {
            for(let i = 0; i < this.animations.length; ++i){
                let info = this.animations[i];
                info.clipNode = info.clipNode || this.node;
                if(!info.clip) {
                    continue;
                }
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
                if (null == state) {
                    continue;
                }
                ++this.playAniCount;
                immediateCallback = false;
                animation.on("finished", this.onAniFinished, this);
            }
        }

        if (immediateCallback && this.callFunc) {
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
