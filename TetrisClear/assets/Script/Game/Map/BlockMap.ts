/************************************************* 
Copyright: wusuiyong 
Author: wusuiyong
Date: 2019-3-24 11:40
Description: 地图逻辑
**************************************************/ 

class BlockMap{

    _row: number = 0;                   // 地图行数      
    _col: number = 0;                   // 地图列数
    _blockData: BlockData[][];          // 地图块信息
    _isDown: boolean = false;           // 是否在下降
    _curBlock: TetrisBlock = null;      // 当前块
    _nextBlock: TetrisBlock = null;     // 下一个块

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

    // 下降
    down(){

    }

    // 旋转
    rorate(){
        if(!this._isDown){
            return;
        }

        this._curBlock.rotate();
    }

    // 下一个
    next(){
        // 将下一个块变成当前块, 随机下一个块
        this._curBlock = this._nextBlock;
        this._nextBlock = null;
    }

    // 检查是否消除
    check(){

    }
};