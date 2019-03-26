/************************************************* 
Copyright: wusuiyong 
Author: wusuiyong
Date: 2019-3-24 11:40
Description: block node 4*4
**************************************************/ 

// 块的信息
class BlockData{
    // 是否有值
    _value: number = 0;   // 0没,1有
    // 十六位颜色
    _color: number = -1;  // 颜色,<0为无颜色

    reset(){
        this._value = 0;
        this._color = -1;
    }

    isSameColor(data: BlockData): boolean{
        return this._color > 0 && this._color == data._color;
    }
};

// 一个方块的组成4*4
const ROW: number = 4;
const COL: number = 4;
class TetrisBlock{
    _blockDatas: BlockData[][] = new BlockData[ROW][COL];

    constructor(blockData: BlockData[][]){
        this._blockDatas = blockData;
    }

    // 右转
    rotate(): void{
        if(ROW != COL){
            return;
        }

        // 将一个二位数组右转
        let blockDataList: BlockData[] = [];
        for(let i = 0; i < COL; ++i){
            for(let j = ROW - 1; j >= 0; --j){
                blockDataList.push(this._blockDatas[i][j]);
            }
        }

        for(let i = 0; i < ROW; ++i){
            for(let j = 0; j < COL; ++j){
                this._blockDatas[i][j] = blockDataList.pop();
            }
        }
    }

    // 重置块
    reset(): void{
        for(let i = 0; i < ROW; ++i){
            for(let j = 0; j < COL; ++j){
                this._blockDatas[i][j].reset();
            }
        }
    }
}