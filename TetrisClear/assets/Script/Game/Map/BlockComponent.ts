/************************************************* 
Copyright: wusuiyong 
Author: wusuiyong
Date: 2019-3-24 11:40
Description: Block component
**************************************************/ 

const {ccclass, property} = cc._decorator;

@ccclass
export default class BlockCompoent extends cc.Component {

    @property(cc.Sprite)
    bgSprite: cc.Sprite = null;
    @property(cc.Label)
    showLb: cc.Label = null;

    start () {

    }

    setBgColor(c: cc.Color){
        this.bgSprite.node.active = true;
        this.bgSprite.node.color = c;
    }

    clearBgColor(){
        this.bgSprite.node.active = false;
    }
}
