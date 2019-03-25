/************************************************* 
Copyright: wusuiyong 
Author: wusuiyong
Date: 2019-3-24 11:40
Description: BlockMap 
**************************************************/ 

class BlockMap{

    _row: number = 0;
    _col: number = 0;
    _blockData: BlockData[][];

    constructor(row: number, col: number){
        this._col = col;
        this._row = row;
        this._blockData = new BlockData[this._col][this._row];
    }
    
    // 初始化地图
    initMap(){

    }

    // 
    start(){

    }

};