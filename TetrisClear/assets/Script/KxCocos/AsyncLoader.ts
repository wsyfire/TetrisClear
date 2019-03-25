/**
 * 分帧加载类
 * 1. 使用这个类加载的资源，会一个一个的加载资源,依赖resLoader
 * 2. 支持设置同时加载的最大数量，超过最大数量后需要调用释放才会继续加载
 * 3. 待加载的资源可以根据优先级加载
 * 2018-11-07 by litao
 */
import ResLoader from "./ResLoader";

interface loadInfo {
    url: string,
    type: typeof cc.Asset,
    priority: number,
    callback: Function
}

class AsycLoader {
    private maxLoadCount = Number.MAX_VALUE;
    //等待加载列表
    private pendingLoadList: loadInfo[] = [];
    //加载中的列表
    private loadingList: loadInfo[] = [];
    private name = "";
    //标志当前是否正在加载中
    private isLoading = false;
    constructor(num = Number.MAX_VALUE, name = "default") {
        this.maxLoadCount = num;
        this.name = name;
    }

    /**
     * 从待加载的列表里加载num个资源到加载列表
     * @param num 加载个数
     */
    private pipeToLoading(num = 1) {
        num = Math.min(num, this.pendingLoadList.length);
        for (let index = 0; index < num; index++) {
            let info = this.pendingLoadList.shift();
            this.loadingList.push(info)
            this.startLoad(info);
        }
    }

    /**
     * 开始调用resloader加载某个资源
     * @param info 资源的信息
     */
    private startLoad(info: loadInfo) {
        console.log("AsycLoader-startLoad", info.url);
        this.isLoading = true;
        ResLoader.getInstance().loadRes(info.url, info.type, (error: Error, resource: any) => {
            console.log("AsycLoader-endLoad", info.url);
            if (info.callback) {
                info.callback(error, resource);
            }
            this.isLoading = false;
            this.checkLoadingList();
        }, ResLoader.makeUseKey("AsyncLoader", this.name))
    }

    /**
     * 检查当前能否加载资源
     */
    private checkLoadingList() {
        //待加载资源列表长度不为0，未达最大加载数量，当前没有资源在加载时可以开始加载
        if (this.loadingList.length < this.maxLoadCount && this.pendingLoadList.length > 0 && !this.isLoading) {
            this.pipeToLoading();
        }
    }

    /**
     * 设置最大加载数量
     * @param num 最大加载数量
     */
    public setMaxLoadCount(num: number) {
        this.maxLoadCount = num;
        this.checkLoadingList();
    }

    /**
     * 
     * @param url 资源路径
     * @param type 类型
     * @param callback 加载完成后回调
     * @param priority 优化级
     * @param isFinishOnCallback 是否在加载完成后就加载下一个，否的话需要手动调一下加载完成回调里传入的函数
     */
    public loadRes(url: string, type: typeof cc.Asset, callback: Function = null, priority: number = 0) {
        let info: loadInfo = {
            url: url,
            type: type,
            callback: callback,
            priority: priority,
        };
        for (let index = 0; index < this.pendingLoadList.length + 1; index++) {
            let element = this.pendingLoadList[index];
            if (!element || element.priority > info.priority) {
                this.pendingLoadList.splice(index, 0, info);
                break;
            }
        }
        this.checkLoadingList();
    }

    /**
     * 清除加载的资源
     * @param url 资源路径
     * @param type 类型
     */
    finishAndClearRes(url, type) {
        console.log("AsycLoader-finishFunc", url);
        let delIndex = -1;
        let resCount = 0;
        for (let index = 0; index < this.loadingList.length; index++) {
            let info = this.loadingList[index];
            if (info.url == url && info.type == type) {
                if (delIndex < 0) {
                    delIndex = index;
                }
                resCount++;
            }
        }
        //加载列表里如果超一个就不释放
        if (resCount == 1) {
            ResLoader.getInstance().releaseRes(url, type, ResLoader.makeUseKey("AsyncLoader", this.name));
            console.log("AsycLoader-releaseRes:" + url);
        }
        //从列表里删除
        if (delIndex >= 0) {
            this.loadingList.splice(delIndex, 1);
            this.checkLoadingList();
        }
    }

    /**
     * 销毁加载器
     */
    destroy() {
        this.pendingLoadList = [];
        //把加载好的资源释放掉
        for (let index = 0; index < this.loadingList.length; index++) {
            let info = this.loadingList[index];
            ResLoader.getInstance().releaseRes(info.url, info.type, ResLoader.makeUseKey("AsyncLoader", this.name));
        }
        this.loadingList = [];
    }
}

/**
 * AsyncLoader的工厂类，可以根据名字创造不同的AsyncLoader
 */
export class AsyncLoaderManager {
    private static loaders: { [key: string]: AsycLoader } = {};
    /**
     * 创建一个分帧加载器
     * @param name 名字
     * @param maxLoadCount 最大加载数量
     */
    public static createLoader(name = "default", maxLoadCount = 1): AsycLoader {
        let loader = this.getLoader(name);
        if (loader) {
            return loader;
        } else {
            let loader = new AsycLoader(maxLoadCount, name);
            this.loaders[name] = loader;
            return loader;
        }
    }

    /**
     * 根据名字去取加载器
     * @param name 名字
     */
    public static getLoader(name: string): AsycLoader {
        if (AsyncLoaderManager.loaders && AsyncLoaderManager.loaders[name]) {
            return AsyncLoaderManager.loaders[name];
        } else {
            return null;
        }
    }

    /**
     * 根据名字去销毁加载器
     * @param name 名字
     */
    public static destroyLoader(name: string) {
        let loader = this.getLoader(name);
        if (loader) {
            loader.destroy();
            delete this.loaders[name];
        } else {
            cc.warn("no loader named :" + name);
        }
    }
}