import { assertContains, assertNotContains, fail } from "../helpers/assertions.mts";
import { applyRuntimePatchesToBody } from "../../src/patch-engine.mts";

export function runRuntimePatchSuite(): void {
  const speedBody = "settings.agent.speed.label;n=se(),{serviceTierSettings:r,setServiceTier:i}=fe();if(!n)return null;let o;";
  const speedResult = applyRuntimePatchesToBody("webview/assets/general-settings-demo.js", speedBody);
  assertContains(speedResult.content, "{serviceTierSettings:r,setServiceTier:i}=fe();let o;", "expected runtime patch engine to keep patching matching Speed settings bodies");
  assertContains(speedResult.patchedLabels.join("\n"), "Speed setting", "expected runtime patch engine to report patched Speed setting target");

  const speedSetting26519Body = "settings.agent.speed.label;n=xe(),{serviceTierSettings:r,setServiceTier:i}=fe();if(!n||r.availableOptions.length<=1)return null;let a;";
  const speedSetting26519Result = applyRuntimePatchesToBody("webview/assets/general-settings-26519.js", speedSetting26519Body);
  assertContains(speedSetting26519Result.content, "if(r.availableOptions.length<=1)return null;let a;", "expected 26.519 Speed settings patch to preserve the option-count guard");
  assertNotContains(speedSetting26519Result.content, "!n||", "expected 26.519 Speed settings patch to remove the Fast availability guard");
  assertContains(speedSetting26519Result.patchedLabels.join("\n"), "Speed setting", "expected 26.519 Speed settings patch to report Speed setting target");

  const serviceTierSlashCommandBody = "composer.speedSlashCommand.disableDescription;let g={id:l,title:u,description:d,requiresEmptyComposer:!1,enabled:n,Icon:c,onSelect:m,dependencies:h};";
  const serviceTierSlashCommandResult = applyRuntimePatchesToBody("webview/assets/composer-26519.js", serviceTierSlashCommandBody);
  assertContains(serviceTierSlashCommandResult.content, "requiresEmptyComposer:!1,enabled:!0,Icon:c", "expected 26.519 service-tier slash command patch to force-enable the command entry");
  assertContains(serviceTierSlashCommandResult.patchedLabels.join("\n"), "Fast slash command", "expected 26.519 service-tier slash command patch to report Fast slash command target");

  const intelligenceSpeed26519Body = "composer.intelligenceDropdown.speed.title;let W;t[53]!==z||t[54]!==v||t[55]!==F||t[56]!==h.availableOptions||t[57]!==h.isLoading||t[58]!==g?(W=v&&h.availableOptions.length>1?(0,Q.jsx)(om,{options:h.availableOptions,selectedServiceTier:F,isLoading:h.isLoading,setServiceTier:g,onSelectComplete:z}):null,t[53]=z,t[54]=v,t[55]=F,t[56]=h.availableOptions,t[57]=h.isLoading,t[58]=g,t[59]=W):W=t[59];";
  const intelligenceSpeed26519Result = applyRuntimePatchesToBody("webview/assets/composer-26519.js", intelligenceSpeed26519Body);
  assertContains(intelligenceSpeed26519Result.content, "W=h.availableOptions.length>1?(0,Q.jsx)(om,{options:h.availableOptions,selectedServiceTier:F,isLoading:h.isLoading,setServiceTier:g,onSelectComplete:z}):null,", "expected 26.519 Intelligence Speed patch to preserve the option-count guard");
  assertNotContains(intelligenceSpeed26519Result.content, "W=v&&", "expected 26.519 Intelligence Speed patch to remove the Fast availability guard");
  assertContains(intelligenceSpeed26519Result.patchedLabels.join("\n"), "Composer Intelligence Speed menu", "expected 26.519 Intelligence Speed patch to report the Speed menu target");

  const pluginsAccess26519Body = "sidebarElectron.pluginsDisabledTooltip;function wb(){let e,n,{authMethod:c}=Ba(),l=Li(`533078438`),u=Cc(c),d=e&&l&&u,f=bs({hostId:Tt}),p=e&&f&&!u,m=gc();}";
  const pluginsAccess26519Result = applyRuntimePatchesToBody("webview/assets/app-main-26519.js", pluginsAccess26519Body);
  assertContains(pluginsAccess26519Result.content, "d=!1,f=bs({hostId:Tt}),p=e&&f", "expected 26.519 Plugins sidebar patch to disable the API-key gate and keep the host capability gate");
  assertNotContains(pluginsAccess26519Result.content, "e&&l&&u", "expected 26.519 Plugins sidebar patch to remove the disabled Plugins nav state");
  assertNotContains(pluginsAccess26519Result.content, "e&&f&&!u", "expected 26.519 Plugins sidebar patch to remove the API-key exclusion from the Plugins label state");
  assertContains(pluginsAccess26519Result.patchedLabels.join("\n"), "Plugins access", "expected 26.519 Plugins sidebar patch to report Plugins access target");

  const nativePipeBody = "function dP(){return lP().info(`browser-use native pipe peer authorization enabled`,{safe:{mode:a?`dev`:`packaged`},sensitive:{}}),e=>{let t=fP(e);return t==null?{authorized:!1,reason:`missing-socket-file-descriptor`}:s.authorizeSocketPeer(t,a)}}";
  const nativePipeResult = applyRuntimePatchesToBody("webview/assets/browser-use-native-pipe-Demo.js", nativePipeBody);
  if (nativePipeResult.content !== nativePipeBody) {
    fail("expected runtime patch engine to leave browser-use native pipe peer auth unchanged", nativePipeResult.content);
  }
  assertNotContains(nativePipeResult.patchedLabels.join("\n"), "Browser-use native pipe peer auth", "expected runtime patch engine not to report removed native pipe target");
}
