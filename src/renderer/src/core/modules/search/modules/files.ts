import { BaseListModule } from "./base";

export class FilesModule extends BaseListModule {
  weight = 41;
  name = "文件列表";
  protected storeKey = "fileList" as const;
}
