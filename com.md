##raw资源池模型

###角色清单
* 部署者（deployer）
* raw资源池共享者（sharer）：根据ego模型形成、失去共享关系。
* 节点管理员（node admin）：

###资产清单
* Token
* 信息资产
	* food
		* plan
		* log
		* review
	* health
		* plan
		* log
		* review
	* node
		* 节点配置备忘（NCM：Node Configuration Memo）：含床位、工作位数量，入驻价格。
		* plan
		* log：只记录node建立、撤销，物品迁入、迁出，sharer注册、撤出等事件。
		* review
* 物品
	* 节点（node）：工作生活地点，由node admin建立并管理。
	* 存档（archive）：永久保存的档案。
	* 工作环境（workenv）：开展工作所需物品。
	* 生活轻包（light）：生活必备物品，远距离搬迁仍然携带。
	* 生活重包（heavy）：入驻后配置，搬迁时丢弃的生活用品。
* 

###接口清单
* 建立node
* 撤销node
* 搬迁node
* 注册node
* 撤出node
* 迁入物品
* 迁出物品
* raw合并
* raw分立


###运行过程
* 建立node
	* node admin租用或购买房产，定期更新并公布以下文件：
		* 节点配置备忘NCM：先在plan中公布，征集意见后实施、当天更新。
		* food、health、node的plan、log：一般当天更新。
	* node公开征集review，由node admin择用。
	* node接受物品托管：
		* sharer的archive。
		* 注册sharer的workenv、light。
* 撤销node：房产租期结束或售出前，由node admin通知各sharer。
* 搬迁node：node搬迁前，node admin向注册sharer征询新node的选址。搬迁时由node admin负责把物品搬运到新node，更新NCM并公布。或按sharer要求将物品送到指定地点。
* 注册node
	* sharer有意入驻node，提前向node admin注册。
	* 注册期间，node admin为share安排床位和工作位，sharer可以入驻node，迁入workenv、ligh
	* node admin修订node plan时征求注册sharer的意见。
	* sharer入驻期间，物品由node admin管理，新物品由node admin统一安排采购，信息资产由node admin在plan中分工完成。
* 撤出node
	* sharer不再入驻node，可通知node admin撤出。
	* node admin将撤出sharer的workenv、light送到指定地点。
* 迁入物品：
	* sharer可以向node迁入archive。
	* 注册sharer可以向node迁入workenv、light。
	* 物品迁入时，应尽量由node admin盘点、整理归放，物品列入NCM文件。
* 迁出物品
	* sharer未入驻期间，可要求node admin将其迁入的物品送至制定地点，并从NCM文件删除。
* raw合并
	* sharer双方同意可以合并。
	* 合并双方archive统一编列，统一存放。
	* 合并双方的raw资源池合并，其它资源池向各人raw资源池注入的资源统一调度。
	* 合并双方作为node admin的node，合并后由双方共同决策、管理。
	* 决策规则：每天每人名下获得一个决策点，每次表决时各人自由投入决策点，取得较多决策点的动议成为决议。投入的决策点从表决者名下扣除。
* raw分立
	* 任何一方提出分立时，raw资源池分立。
	* 分立前的archive，可复制的各持一份，不可复制的协议分配，协议不成的以决策点分配，多者得。
	* 分立后各方raw资源池入口分立，分立时资源池内资源协议分配，协议不成以决策点分配，可划分的加权分配，不可划分的多者得。
	* 分立时共同决策管理的node，分立后由一方作为node admin，协议不成的以决策点分配，多者得。

###分配规则
* food
	* plan：800 Token/week
	* reivew：800 Token/week
	* log：64 Token/day
* health
	* plan：2000 Token/month
	* reivew：2000 Token/month
	* log：64 Token/day
* node
	* plan：新node首月 10000 Token，次月起1000 Token/month 
	* reivew：1000 Token/month
	* log：64 Token/条