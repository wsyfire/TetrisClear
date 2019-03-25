/************************************************* 
Copyright: wusuiyong 
Author: wusuiyong
Date: 2019-3-24 11:40
Description: map ui 
**************************************************/ 
import UIView from "../../KxCocos/UI/UIView";

const {ccclass, property} = cc._decorator;

@ccclass
export default class UIMap extends UIView {

    @property(cc.Label)
    label: cc.Label = null;

    @property(cc.Button)
    leftBtn: cc.Button = null;

    start () {

    }

    update(dt: number){

    }
}
