type Release = () => void;

/**
 * 단일 Node 프로세스 내에서만 동작하는 간단한 뮤텍스.
 * TSV 파일 접근 시 동시성 경합 완화용.
 */
class Mutex {
  private queue: Array<(release: Release) => void> = [];
  private locked = false;

  async acquire(): Promise<Release> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }
    return new Promise<Release>((resolve) => {
      this.queue.push((release) => resolve(release));
    });
  }

  private release() {
    const next = this.queue.shift();
    if (!next) {
      this.locked = false;
      return;
    }
    next(() => this.release());
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __diaryMutex: Mutex | undefined;
}

export const diaryMutex: Mutex = globalThis.__diaryMutex ?? new Mutex();
globalThis.__diaryMutex = diaryMutex;

