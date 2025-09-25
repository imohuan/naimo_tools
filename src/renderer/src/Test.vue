<script setup lang="ts">
// import { PluginGithub } from "@/core/plugin/PluginGithub";

// const gb = PluginGithub.getInstance()
// console.log({ list: gb.getPluginList() });

onMounted(() => {
  naimo.auto.fetchHTML("https://www.baidu.com", {
    show: true,
    steps: [
      { action: "waitForTimeout", args: [1000000] }
    ]
  }).then(res => {
    console.log("Fetch HTML", res.getConfig({ cls: "title::text" }), res.getImages());
  });
})
</script>