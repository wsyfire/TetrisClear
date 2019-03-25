/**
 * 资源加载类
 * 1. 加载完成后自动记录引用关系，根据DependKeys记录反向依赖
 * 2. 支持资源占用，如某打开的UI占用了A资源，其他地方释放资源B，资源B引用了资源A，如果没有其他引用资源A的资源，会触发资源A的释放，
 * 3. 能够安全释放依赖资源（一个资源同时被多个资源引用，只有当其他资源都释放时，该资源才会被释放）
 * 
 * 2018-7-17 by 宝爷
 */

// 资源加载的处理回调
export type ProcessCallback = (completedCount: number, totalCount: number, item: any) => void;
// 资源加载的完成回调
export type CompletedCallback = (error: Error, resource: any) => void;

// 引用和占用的结构体
interface CacheInfo {
    refs: Set<string>,
    uses: Set<string>
}

// LoadRes方法的参数结构
interface LoadResArgs {
    url: string,
    type?: typeof cc.Asset,
    onCompleted?: CompletedCallback,
    onProgess?: ProcessCallback,
    use?: string,
}

// ReleaseRes方法的参数结构
interface ReleaseResArgs {
    url: string,
    type?: typeof cc.Asset,
    use?: string,
}

export default class ResLoader {

    private _resMap: Map<string, CacheInfo> = new Map<string, CacheInfo>();
    private static _resLoader: ResLoader = null;
    public static getInstance(): ResLoader {
        if (!this._resLoader) {
            this._resLoader = new ResLoader();
        }
        return this._resLoader;
    }

    public static destroy(): void {
        if (this._resLoader) {
            this._resLoader = null;
        }
    }

    private constructor() {

    }

    /**
     * 从cc.loader中获取一个资源的item
     * @param url 查询的url
     * @param type 查询的资源类型
     */
    private _getResItem(url: string, type: typeof cc.Asset): any {
        let ccloader: any = cc.loader;
        let item = ccloader._cache[url];
        if (!item) {
            let uuid = ccloader._getResUuid(url, type, true);
            if (uuid) {
                let ref = ccloader._getReferenceKey(uuid);
                item = ccloader._cache[ref];
            }
        }
        return item;
    }

    /**
     * loadRes方法的参数预处理
     */
    private _makeLoadResArgs(): LoadResArgs {
        if (arguments.length < 1 || typeof arguments[0] != "string") {
            console.error(`_makeLoadResArgs error ${arguments}`);
            return null;
        }
        let ret: LoadResArgs = { url: arguments[0] };
        for (let i = 1; i < arguments.length; ++i) {
            if (i == 1 && cc.isChildClassOf(arguments[i], cc.RawAsset)) {
                // 判断是不是第一个参数type
                ret.type = arguments[i];
            } else if (i == arguments.length - 1 && typeof arguments[i] == "string") {
                // 判断是不是最后一个参数use
                ret.use = arguments[i];
            } else if (typeof arguments[i] == "function") {
                // 其他情况为函数
                if (arguments.length > i + 1 && typeof arguments[i + 1] == "function") {
                    ret.onProgess = arguments[i];
                } else {
                    ret.onCompleted = arguments[i];
                }
            }
        }
        return ret;
    }

    /**
     * releaseRes方法的参数预处理
     */
    private _makeReleaseResArgs(): ReleaseResArgs {
        if (arguments.length < 1 || typeof arguments[0] != "string") {
            console.error(`_makeReleaseResArgs error ${arguments}`);
            return null;
        }
        let ret: ReleaseResArgs = { url: arguments[0] };
        for (let i = 1; i < arguments.length; ++i) {
            if (typeof arguments[i] == "string") {
                ret.use = arguments[i];
            } else {
                ret.type = arguments[i];
            }
        }
        return ret;
    }

    /**
     * 生成一个资源占用Key
     * @param where 在哪里使用，如Scene、UI、Pool
     * @param who 占用者，如Login、UIHelp...
     * @param why 占用原因，自定义...
     */
    public static makeUseKey(where: string, who: string = "none", why: string = ""): string {
        return `use_${where}_by_${who}_for_${why}`;
    }

    /**
     * 获取资源缓存信息
     * @param key 要获取的资源url
     */
    public getCacheInfo(key: string): CacheInfo {
        if (!this._resMap.has(key)) {
            this._resMap.set(key, {
                refs: new Set<string>(),
                uses: new Set<string>()
            });
        }
        return this._resMap.get(key);
    }

    /**
     * 开始加载资源
     * @param url           资源url
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     * @param use           资源占用key，根据makeUseKey方法生成
     */
    public loadRes(url: string, use?: string);
    public loadRes(url: string, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, onCompleted: CompletedCallback, use?: string);
    public loadRes(url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback, use?: string);
    public loadRes() {
        let resArgs: LoadResArgs = this._makeLoadResArgs.apply(this, arguments);
        console.time("loadRes|" + resArgs.url);
        let finishCallback = (error: Error, resource: any) => {
            // 反向关联引用（为所有引用到的资源打上本资源引用到的标记）
            let addDependKey = (item, refKey) => {
                if (item && item.dependKeys && Array.isArray(item.dependKeys)) {
                    for (let depKey of item.dependKeys) {
                        // 记录该资源被我引用
                        this.getCacheInfo(depKey).refs.add(refKey);
                        // cc.log(`${depKey} ref by ${refKey}`);
                        let ccloader: any = cc.loader;
                        let depItem = ccloader._cache[depKey]
                        addDependKey(depItem, refKey)
                    }
                } /* else  {
                    cc.log(`ref key ${refKey} has no dependKeys`);
                } */
            }

            let item = this._getResItem(resArgs.url, resArgs.type);
            if (item && item.url) {
                addDependKey(item, item.url);
            } /* else {
                cc.warn(`addDependKey item error1! for ${resArgs.url}`);
            } */

            // 给自己加一个自身的引用
            if (item) {
                let info = this.getCacheInfo(item.url);
                info.refs.add(item.url);
                // 更新资源占用
                if (resArgs.use) {
                    info.uses.add(resArgs.use);
                }
            }

            console.timeEnd("loadRes|" + resArgs.url);
            // 执行完成回调
            if (resArgs.onCompleted) {
                resArgs.onCompleted(error, resource);
            }
        };

        let loadContentTime = new Date().getTime();
        let progressCallBack = (completedCount: number, totalCount: number, item: any)=>{
            // 打印加载时间
            /*
            let interval = (new Date().getTime() - loadContentTime)/1000;
            let path: string = item.rawUrl;
            let type: string = "unknow";
            let loader: any = cc.loader
            if (path.lastIndexOf('/') != -1) {
                path = path.slice(path.lastIndexOf('/') + 1);
            }
            if (path.lastIndexOf('.')) {
                path = path.slice(0, path.lastIndexOf('.'));
            }
            if (loader && loader._resources && loader._resources._getInfo_DEBUG) {
                let info = {path: "", type: Function};
                let bSucess = loader._resources._getInfo_DEBUG(path, info);
                path = bSucess ? info.path : path;
                type = bSucess ? info.type.name : type;
            }
            loadContentTime = new Date().getTime();
            console.log(`${"3721"}|${totalCount}/${completedCount} ${resArgs.url}  ${path} type:${type} cost:${interval.toFixed(4)}s`);
            //*/

            if (resArgs.onProgess) {
                resArgs.onProgess(completedCount, totalCount, item);
            }
        }

        // 预判是否资源已加载
        let res = cc.loader.getRes(resArgs.url, resArgs.type);
        if (res) {
            finishCallback(null, res);
        } else {
            cc.loader.loadRes(resArgs.url, resArgs.type, progressCallBack, finishCallback);
        }
    }

    /**
     * 释放资源
     * @param url   要释放的url
     * @param type  资源类型
     * @param use   要解除的资源占用key，根据makeUseKey方法生成
     */
    public releaseRes(url: string, use?: string);
    public releaseRes(url: string, type: typeof cc.Asset, use?: string)
    public releaseRes() {
        /**暂时不释放资源 */
        // return;

        let resArgs: ReleaseResArgs = this._makeReleaseResArgs.apply(this, arguments);
        let item = this._getResItem(resArgs.url, resArgs.type);
        if (!item) {
            console.warn(`releaseRes item is null ${resArgs.url} ${resArgs.type}`);
            return;
        }

        // cc.log("resloader release item");
        // cc.log(arguments);
        let cacheInfo = this.getCacheInfo(item.url);
        if (resArgs.use) {
            cacheInfo.uses.delete(resArgs.use)
        }
        this._release(item, item.url);
    }

    // 释放一个资源
    private _release(item, itemUrl) {
        if (!item) {
            return;
        }
        let cacheInfo = this.getCacheInfo(item.url);
        // 解除自身对自己的引用
        cacheInfo.refs.delete(itemUrl);

        if (cacheInfo.uses.size == 0 && cacheInfo.refs.size == 0) {
            // 解除引用
            let delDependKey = (item, refKey) => {
                if (item && item.dependKeys && Array.isArray(item.dependKeys)) {
                    for (let depKey of item.dependKeys) {
                        let ccloader: any = cc.loader;
                        let depItem = ccloader._cache[depKey]
                        // cc.log(`release item ${depKey} depend by ${refKey}`);
                        // this.getCacheInfo(depKey).refs.delete(refKey);
                        this._release(depItem, refKey);
                    }
                }
            }
            // cc.log(`relase item ${item.url} dependKey`);
            delDependKey(item, itemUrl);
            //如果没有uuid,就直接释放url
            if (item.uuid) {
                cc.loader.release(item.uuid);
                cc.log("resloader release item by uuid :" + item.url);
            } else {
                cc.loader.release(item.url);
                cc.log("resloader release item by url:" + item.url);
            }
        } /* else {
            cc.log(`_release ${item.url} fail userSize ${cacheInfo.uses.size}, refSize: ${cacheInfo.refs.size}`);
            cc.log(cacheInfo.refs);
        } */
    }

    /**
     * 判断一个资源能否被释放
     * @param url 资源url
     * @param type  资源类型
     * @param use   要解除的资源占用key，根据makeUseKey方法生成
     */
    public checkReleaseUse(url: string, use?: string): boolean;
    public checkReleaseUse(url: string, type: typeof cc.Asset, use?: string): boolean
    public checkReleaseUse() {
        let resArgs: ReleaseResArgs = this._makeReleaseResArgs.apply(this, arguments);
        let item = this._getResItem(resArgs.url, resArgs.type);
        if (!item) {
            console.log(`cant release,item is null ${resArgs.url} ${resArgs.type}`);
            return true;
        }

        let cacheInfo = this.getCacheInfo(item.url);
        let checkUse = false;
        let checkRef = false;

        if (resArgs.use && cacheInfo.uses.size > 0) {
            if (cacheInfo.uses.size == 1 && cacheInfo.uses.has(resArgs.use)) {
                checkUse = true;
            } else {
                checkUse = false;
            }
        } else {
            checkUse = true;
        }

        if ((cacheInfo.refs.size == 1 && cacheInfo.refs.has(item.url)) || cacheInfo.refs.size == 0) {
            checkRef = true;
        } else {
            checkRef = false;
        }

        return checkUse && checkRef;
    }

}
