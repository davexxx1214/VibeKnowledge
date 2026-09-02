export interface UserPort {
  find(id: string): string;
}

export class BaseService {
  protected readonly ready = true;
}
