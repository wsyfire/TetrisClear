const { ccclass, property, executionOrder } = cc._decorator;

/** 适配部位 */
enum EAdaptPlace {
    /** 适配宽 */
    FitWidth,
    /** 适配高 */
    FitHeight,
    /** 适配IphoneX(自动下移) */
    FitIPhoneX,
    /** 全部显示 */
    FitShowAll,
    /** 全部填满 */
    FitFillShow,
}

/** 适配类型 */
enum EAdaptType {
    /** 节点放大 */
    Scale,
    /** 设置尺寸 */
    Size,
}

/** 计算方式 */
enum ECountType {
    /** 根据节点尺寸 */
    NodeSize,
    /** 根据手机显示的分辨率 */
    WinSize
}

/**
 ** 创建人: liaozhiqiang
 ** 日  期: 2018-6-22
 ** 版  本: 1.0
 ** 描  述: 节点适配
 ** 应  用: 
*/
@ccclass
@executionOrder(999)
export class CNodeAdapt extends cc.Component {

    /** 适配部位 */
    @property({
        type: cc.Enum(EAdaptPlace),
        tooltip: "FitWidth:适配宽\nFitHeight:适配高\nFitIPhoneX:适配IphoneX(自动下移)\nFitShowAll全部显示(可能留边)\nFitFillShow平铺显示(可能被裁切)"
    })
    private adaptPlace = EAdaptPlace.FitWidth;

    /** 适配类型 */
    @property({
        type: cc.Enum(EAdaptType),
        tooltip: `Scale:节点放大
            Size:设置尺寸`
    })
    private adaptType = EAdaptType.Scale;

    /** 计算方式 */
    @property({
        type: cc.Enum(ECountType),
        tooltip: `NodeSize:根据节点尺寸
            WinSize:根据手机显示的分辨率`
    })
    protected countType = ECountType.NodeSize;

    /** 等比适配 */
    @property({
        tooltip: "等比改变"
    })
    private uniform = false;

    /** 允许变大 */
    @property({
        tooltip: "允许变大"
    })
    private allowBig = false;
    /** 允许变小 */
    @property({
        tooltip: "允许变小"
    })
    private allowSmall = true;

    protected setAdapt(scaleX: number, scaleY: number, targetSize: cc.Size) {
        if (this.adaptType == EAdaptType.Scale) {
            this.node.scaleX = scaleX;
            this.node.scaleY = scaleY;
        } else if (this.adaptType == EAdaptType.Size) {
            this.node.setContentSize(targetSize.width * scaleX, targetSize.height * scaleY);
        }
    }

    protected updateAdapt(targetSize: cc.Size) {
        let winSize = cc.view.getVisibleSize();
        let scaleX = 1;
        let scaleY = 1;

        // 计算缩放
        if (targetSize.width > 0) {
            scaleX = winSize.width / targetSize.width;
        }
        if (targetSize.height > 0) {
            scaleY = winSize.height / targetSize.height;
        }

        // 限制缩放
        if (!this.allowBig) {
            scaleX = Math.min(scaleX, 1);
            scaleY = Math.min(scaleY, 1);
        } else if (!this.allowSmall) {
            scaleX = Math.max(scaleX, 1);
            scaleY = Math.max(scaleY, 1);
        }

        // 维持原样
        if (scaleX == 1 && scaleY == 1) {
            return;
        }

        // 适配
        if (this.adaptPlace == EAdaptPlace.FitWidth) {
            this.uniform ? scaleY = scaleX : scaleY = 1;
        } else if (this.adaptPlace == EAdaptPlace.FitHeight) {
            this.uniform ? scaleX = scaleY : scaleY = 1;
        } else if (this.adaptPlace == EAdaptPlace.FitShowAll) {
            scaleX = scaleY = Math.min(scaleX, scaleY);
        } else if (this.adaptPlace == EAdaptPlace.FitFillShow) {
            scaleX = scaleY = Math.max(scaleX, scaleY);
        }
        this.setAdapt(scaleX, scaleY, targetSize);
    }

    start() {
        let winSize = cc.view.getVisibleSize();
        if (EAdaptPlace.FitIPhoneX == this.adaptPlace) {
            // iphoneX的适配
            if (winSize.width / winSize.height < 0.47) {
                this.node.y -= 88;
            }
            return;
        }

        // 要适配对象的尺寸
        let targetSize = cc.Canvas.instance.designResolution;
        if (ECountType.NodeSize == this.countType) {
            targetSize = this.node.getContentSize();
        }
        this.updateAdapt(targetSize);
    }
}
