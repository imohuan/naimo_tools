import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { createPinia } from "pinia";

const app = createApp(App);
app.use(createPinia());

// 配置Vue全局错误处理
app.config.errorHandler = (err, _instance, info) => {
  console.log("🔍 Vue错误处理器被触发:", err, info);
  naimo.log.throw_error(err, { title: "Vue Error" });
};

// 配置Vue警告处理
app.config.warnHandler = (msg, _instance, trace) => {
  naimo.log.warn("⚠️ Vue警告:", msg, trace);
};

app.mount("#app");
