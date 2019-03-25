
import { UIID, UIPrefab } from "./UIConfig"
/*
场景配置ID 枚举
*/
enum SceneID {
    SceneNone,
    SceneLogin,
    SceneHall,
}


/* 场景ID对应的场景名字*/
var SceneName = {
    [SceneID.SceneLogin]: "SceneLogin",
    [SceneID.SceneHall]: "SceneHall",
}
/*
场景配置
-- key为SceneID，value为Scene配置table
-- loadingView：对应场景切换时的Loading的SceneID
*/
var SceneConfig = {
    [SceneID.SceneLogin]: {},
    [SceneID.SceneHall]: { defaultUIID: UIID.UIHall },
}

export { SceneID, SceneName, SceneConfig }
