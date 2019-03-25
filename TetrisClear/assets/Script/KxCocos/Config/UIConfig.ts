
/** 界面配置，和表关联，不要在中间插入 */
enum UIID {
    UINone = 0,
    UILogin,        // 登录界面
    UISetting = 2,      // 设置界面
    UIHall,         // 主界面
}

//
let UIPrefab : {[key:number]:string} = {
    [UIID.UILogin]:"GUI/login/UILogin",
    [UIID.UIHall]:"GUI/hall/UIHall",
}

// 场景中canvas子节点zorder的枚举
enum CANVAS_ZORDER {
    BE_ATTACT_SHAKE = 99,
    BIG_WIN = 500,
    GOLD_EFFECT = 501,
    STOP_TOUCH = 550,
    Reward = 600,
    TIPS = 10001,
    BUILD_GOLD = 15000,
    UPDATE = 20000,
    LOADING = 20001,
    CLICK_EFFECT = 30001,
    GM_BTN = 40001,
    GUIDE = 50000,              // 新手引导处于最高
}

export {UIID,UIPrefab,CANVAS_ZORDER};