export class WorkerPool {
    private workers: Worker[] = [];
    private freeWorkers: Worker[] = [];
    private taskQueue: Array<{
        message: any;
        transfer?: Transferable[];
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    }> = [];

    constructor(workerFactory: () => Worker, poolSize: number = 4) {
        for (let i = 0; i < poolSize; i++) {
            const worker = workerFactory();
            this.workers.push(worker);
            this.freeWorkers.push(worker);
        }
    }

    public execute(message: any, transfer?: Transferable[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const task = { message, transfer, resolve, reject };

            if (this.freeWorkers.length > 0) {
                const worker = this.freeWorkers.pop()!;
                this.runTask(worker, task);
            } else {
                this.taskQueue.push(task);
            }
        });
    }

    private runTask(worker: Worker, task: any) {
        worker.onmessage = (event) => {
            task.resolve(event);
            this.releaseWorker(worker);
        };

        worker.onerror = (error) => {
            task.reject(error);
            this.releaseWorker(worker);
        };

        worker.postMessage(task.message, task.transfer || []);
    }

    private releaseWorker(worker: Worker) {
        worker.onmessage = null;
        worker.onerror = null;

        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift()!;
            this.runTask(worker, nextTask);
        } else {
            this.freeWorkers.push(worker);
        }
    }

    public terminateAll() {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.freeWorkers = [];
        this.taskQueue = [];
    }
}