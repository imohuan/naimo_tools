/**
 * 数据库模块
 * 使用 lowdb 实现文档数据库，兼容 uTools db API
 * 每个插件拥有独立的数据库文件
 */

import { app, BrowserWindow } from "electron";
import log from "electron-log";
import path from "path";
import fs from "fs-extra";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import type { DbDoc, DbResult } from "@shared/typings/naimoApiTypes";

// 数据库结构
interface DbData {
  documents: { [key: string]: DbDoc };
  attachments: { [key: string]: { data: string; type: string } }; // Buffer 转为 base64 字符串存储
}

// 数据文件路径
const DB_PATH = path.join(app.getPath("userData"), "db");

// 缓存每个插件的数据库实例
const dbInstances = new Map<string, Low<DbData>>();

/**
 * 从插件名称参数或 URL 中获取插件名称
 */
function getPluginName(pluginName?: string, event?: Electron.IpcMainInvokeEvent): string {
  // 优先使用传入的插件名称参数
  if (pluginName) {
    return pluginName;
  }

  // 尝试从 URL 中提取
  if (event) {
    try {
      const webContents = event.sender;
      const url = webContents.getURL();

      // 从 URL 中提取插件名称
      // 例如: file:///path/to/plugins/my-plugin/index.html -> my-plugin
      const match = url.match(/plugins[\/\\]([^\/\\]+)[\/\\]/);
      if (match && match[1]) {
        return match[1];
      }
    } catch (error) {
      log.warn("⚠️ 无法从 URL 获取插件名称:", error);
    }
  }

  // 使用默认名称
  return "default";
}

/**
 * 获取或创建插件的数据库实例
 */
async function getPluginDb(pluginName: string): Promise<Low<DbData>> {
  // 如果已存在实例，直接返回
  if (dbInstances.has(pluginName)) {
    return dbInstances.get(pluginName)!;
  }

  try {
    // 确保目录存在
    await fs.ensureDir(DB_PATH);

    // 创建插件专属的数据库文件
    const dbFilePath = path.join(DB_PATH, `${pluginName}.json`);

    // 创建 lowdb 实例
    const adapter = new JSONFile<DbData>(dbFilePath);
    const db = new Low(adapter, {
      documents: {},
      attachments: {},
    });

    // 读取数据
    await db.read();

    // 如果数据库为空，初始化默认结构
    if (!db.data || !db.data.documents) {
      db.data = {
        documents: {},
        attachments: {},
      };
      await db.write();
      log.info(`📦 插件 [${pluginName}] 数据库初始化成功: ${dbFilePath}`);
    } else {
      log.info(`📦 插件 [${pluginName}] 数据库加载成功`);
    }

    // 缓存实例
    dbInstances.set(pluginName, db);
    return db;
  } catch (error) {
    log.error(`❌ 插件 [${pluginName}] 数据库初始化失败:`, error);
    throw error;
  }
}

/**
 * 生成版本号
 */
function generateRev(): string {
  return `1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 存储文档
 * @param event IPC事件对象
 * @param doc 要存储的文档
 * @param pluginName 插件名称（可选，从 webpagePreload 传递）
 * @returns 存储结果
 */
export async function put(
  event: Electron.IpcMainInvokeEvent,
  doc: DbDoc,
  pluginName?: string
): Promise<DbResult> {
  try {
    if (!doc._id) {
      return {
        id: "",
        ok: false,
        error: true,
        name: "missing_id",
        message: "文档缺少 _id 字段",
      };
    }

    // 获取插件名称和对应的数据库实例
    const actualPluginName = getPluginName(pluginName, event);
    const db = await getPluginDb(actualPluginName);

    // 生成或更新版本号
    const rev = generateRev();
    const docWithRev = { ...doc, _rev: rev };

    // 存储文档（使用 lowdb）
    db.data.documents[doc._id] = docWithRev;
    await db.write();

    log.info(`📦 [${actualPluginName}] 存储文档成功: ${doc._id}`);
    return {
      id: doc._id,
      rev: rev,
      ok: true,
    };
  } catch (error) {
    log.error("❌ 存储文档失败:", error);
    return {
      id: doc._id || "",
      ok: false,
      error: true,
      name: "unknown_error",
      message: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取文档
 * @param event IPC事件对象
 * @param id 文档ID
 * @param pluginName 插件名称（可选）
 * @returns 文档内容，不存在则返回null
 */
export async function get(
  event: Electron.IpcMainInvokeEvent,
  id: string,
  pluginName?: string
): Promise<DbDoc | null> {
  try {
    const actualPluginName = getPluginName(pluginName, event);
    const db = await getPluginDb(actualPluginName);

    await db.read(); // 读取最新数据
    const doc = db.data.documents[id];
    if (doc) {
      log.info(`📦 [${actualPluginName}] 获取文档成功: ${id}`);
      return doc;
    } else {
      log.info(`📦 [${actualPluginName}] 文档不存在: ${id}`);
      return null;
    }
  } catch (error) {
    log.error("❌ 获取文档失败:", error);
    return null;
  }
}

/**
 * 删除文档
 * @param event IPC事件对象
 * @param id 文档ID
 * @param pluginName 插件名称（可选）
 * @returns 删除结果
 */
export async function remove(
  event: Electron.IpcMainInvokeEvent,
  id: string,
  pluginName?: string
): Promise<DbResult> {
  try {
    const actualPluginName = getPluginName(pluginName, event);
    const db = await getPluginDb(actualPluginName);

    await db.read(); // 读取最新数据
    if (db.data.documents[id]) {
      delete db.data.documents[id];
      await db.write();
      log.info(`📦 [${actualPluginName}] 删除文档成功: ${id}`);
      return {
        id: id,
        ok: true,
      };
    } else {
      return {
        id: id,
        ok: false,
        error: true,
        name: "not_found",
        message: "文档不存在",
      };
    }
  } catch (error) {
    log.error("❌ 删除文档失败:", error);
    return {
      id: id,
      ok: false,
      error: true,
      name: "unknown_error",
      message: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取所有文档
 * @param event IPC事件对象
 * @param docPrefix 可选的ID前缀过滤
 * @param pluginName 插件名称（可选）
 * @returns 文档数组
 */
export async function allDocs(
  event: Electron.IpcMainInvokeEvent,
  docPrefix?: string,
  pluginName?: string
): Promise<DbDoc[]> {
  try {
    const actualPluginName = getPluginName(pluginName, event);
    const db = await getPluginDb(actualPluginName);

    await db.read(); // 读取最新数据
    let docs = Object.values(db.data.documents);

    // 如果提供了前缀，进行过滤
    if (docPrefix) {
      docs = docs.filter((doc) => doc._id.startsWith(docPrefix));
    }

    log.info(`📦 [${actualPluginName}] 获取所有文档成功，共 ${docs.length} 个文档`);
    return docs;
  } catch (error) {
    log.error("❌ 获取所有文档失败:", error);
    return [];
  }
}

/**
 * 批量存储文档
 * @param event IPC事件对象
 * @param docs 文档数组
 * @param pluginName 插件名称（可选）
 * @returns 存储结果数组
 */
export async function bulkDocs(
  event: Electron.IpcMainInvokeEvent,
  docs: DbDoc[],
  pluginName?: string
): Promise<DbResult[]> {
  try {
    const results: DbResult[] = [];

    for (const doc of docs) {
      const result = await put(event, doc, pluginName);
      results.push(result);
    }

    const actualPluginName = getPluginName(pluginName, event);
    log.info(`📦 [${actualPluginName}] 批量存储文档成功，共 ${docs.length} 个文档`);
    return results;
  } catch (error) {
    log.error("❌ 批量存储文档失败:", error);
    return [];
  }
}

/**
 * 存储附件
 * @param event IPC事件对象
 * @param id 文档ID
 * @param data 附件数据（Buffer）
 * @param type 附件类型
 * @param pluginName 插件名称（可选）
 * @returns 存储结果
 */
export async function putAttachment(
  event: Electron.IpcMainInvokeEvent,
  id: string,
  data: Buffer,
  type: string,
  pluginName?: string
): Promise<DbResult> {
  try {
    const actualPluginName = getPluginName(pluginName, event);
    const db = await getPluginDb(actualPluginName);

    // Buffer 转为 base64 字符串存储
    const base64Data = data.toString("base64");
    db.data.attachments[id] = { data: base64Data, type };
    await db.write();

    log.info(`📦 [${actualPluginName}] 存储附件成功: ${id}`);
    return {
      id: id,
      ok: true,
    };
  } catch (error) {
    log.error("❌ 存储附件失败:", error);
    return {
      id: id,
      ok: false,
      error: true,
      name: "unknown_error",
      message: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取附件
 * @param event IPC事件对象
 * @param id 文档ID
 * @param pluginName 插件名称（可选）
 * @returns 附件数据，不存在则返回null
 */
export async function getAttachment(
  event: Electron.IpcMainInvokeEvent,
  id: string,
  pluginName?: string
): Promise<{ data: Buffer; type: string } | null> {
  try {
    const actualPluginName = getPluginName(pluginName, event);
    const db = await getPluginDb(actualPluginName);

    await db.read(); // 读取最新数据
    const attachment = db.data.attachments[id];
    if (attachment) {
      // base64 字符串转回 Buffer
      const buffer = Buffer.from(attachment.data, "base64");
      log.info(`📦 [${actualPluginName}] 获取附件成功: ${id}`);
      return { data: buffer, type: attachment.type };
    } else {
      log.info(`📦 [${actualPluginName}] 附件不存在: ${id}`);
      return null;
    }
  } catch (error) {
    log.error("❌ 获取附件失败:", error);
    return null;
  }
}

