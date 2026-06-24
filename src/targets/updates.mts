import { defineTargetSpecs } from "./builders.mts";

const SETTINGS_SCHEMA_NEEDLE = "preventSleepWhileRunning";
const GENERAL_SETTINGS_NEEDLE = "settings.general.power.preventSleepWhileRunning.description";

const SETTINGS_SCHEMA_GUARDED_SIGNATURE =
  /(preventSleepWhileRunning:([A-Za-z_$][\w$]*)\(\{agentAccess:`read-write`,default:!1,description:`Whether the machine stays awake while Codex is running`,key:`preventSleepWhileRunning`,schema:([A-Za-z_$][\w$]*)\}\),)/;
const SETTINGS_SCHEMA_PATCHED_SIGNATURE =
  /disableAutomaticUpdates:[A-Za-z_$][\w$]*\(\{agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:[A-Za-z_$][\w$]*\}\)/;

const GENERAL_SETTINGS_GUARDED_SIGNATURE =
  /function Kr\(\)\{let e=\(0,\$\.c\)\(10\),t=a\(s\),\{platform:n\}=Ee\(\),r=n!==`windows`,i=N\(\),o=z\(j\.preventSleepWhileRunning\);if\(!r\)return null;let c,l;e\[0\]===Symbol\.for\(`react\.memo_cache_sentinel`\)\?\(c=\(0,Z\.jsx\)\(P,\{\.\.\.G\.preventSleepWhileRunning\}\),l=\(0,Z\.jsx\)\(P,\{id:`settings\.general\.power\.preventSleepWhileRunning\.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`\}\),e\[0\]=c,e\[1\]=l\):\(c=e\[0\],l=e\[1\]\);let u=o\?\?!1,d;e\[2\]===t\?d=e\[3\]:\(d=e=>\{B\(t,j\.preventSleepWhileRunning,e\)\},e\[2\]=t,e\[3\]=d\);let f;e\[4\]===i\?f=e\[5\]:\(f=i\.formatMessage\(G\.preventSleepWhileRunning\),e\[4\]=i,e\[5\]=f\);let p;return e\[6\]!==u\|\|e\[7\]!==d\|\|e\[8\]!==f\?\(p=\(0,Z\.jsx\)\(J,\{label:c,description:l,control:\(0,Z\.jsx\)\(q,\{checked:u,onChange:d,ariaLabel:f\}\)\}\),e\[6\]=u,e\[7\]=d,e\[8\]=f,e\[9\]=p\):p=e\[9\],p\}/;
const GENERAL_SETTINGS_PATCHED_SIGNATURE =
  /codexfastUpdateMessages[^]*?B\(t,j\.disableAutomaticUpdates,e\)/;

const GENERAL_SETTINGS_REPLACEMENT = [
  "function Kr(){let e=(0,$.c)(17),t=a(s),{platform:n}=Ee(),r=n!==`windows`,i=N(),o=z(j.preventSleepWhileRunning),codexfastDisableAutomaticUpdates=z(j.disableAutomaticUpdates);if(!r)return null;let c,l;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,Z.jsx)(P,{...G.preventSleepWhileRunning}),l=(0,Z.jsx)(P,{id:`settings.general.power.preventSleepWhileRunning.description`,defaultMessage:`Keep your computer awake while Codex is running a chat`,description:`Description for preventing sleep while a chat runs`}),e[0]=c,e[1]=l):(c=e[0],l=e[1]);let u=o??!1,d;e[2]===t?d=e[3]:(d=e=>{B(t,j.preventSleepWhileRunning,e)},e[2]=t,e[3]=d);let f;e[4]===i?f=e[5]:(f=i.formatMessage(G.preventSleepWhileRunning),e[4]=i,e[5]=f);let p;e[6]!==u||e[7]!==d||e[8]!==f?(p=(0,Z.jsx)(J,{label:c,description:l,control:(0,Z.jsx)(q,{checked:u,onChange:d,ariaLabel:f})}),e[6]=u,e[7]=d,e[8]=f,e[9]=p):p=e[9];",
  "let codexfastUpdateLocale=(i.locale??globalThis.navigator?.language??``).toLowerCase(),codexfastUpdateMessages=codexfastUpdateLocale.startsWith(`zh-cn`)||codexfastUpdateLocale.startsWith(`zh-hans`)?{label:`停用自动更新`,description:`停止后续后台更新检查，但不影响手动“检查更新”。`}:codexfastUpdateLocale.startsWith(`zh-tw`)||codexfastUpdateLocale.startsWith(`zh-hk`)||codexfastUpdateLocale.startsWith(`zh-hant`)?{label:`停用自動更新`,description:`停止後續背景更新檢查，但不影響手動「檢查更新」。`}:codexfastUpdateLocale.startsWith(`ja`)?{label:`自動更新を無効にする`,description:`今後のバックグラウンド更新チェックを停止します。手動の「アップデートを確認」は無効になりません。`}:codexfastUpdateLocale.startsWith(`ko`)?{label:`자동 업데이트 비활성화`,description:`수동 업데이트 확인은 유지하면서 이후 백그라운드 업데이트 확인을 중지합니다.`}:codexfastUpdateLocale.startsWith(`fr`)?{label:`Désactiver les mises à jour automatiques`,description:`Arrête les prochaines recherches de mises à jour en arrière-plan sans désactiver la recherche manuelle.`}:codexfastUpdateLocale.startsWith(`de`)?{label:`Automatische Updates deaktivieren`,description:`Stoppt künftige Hintergrundprüfungen auf Updates, ohne die manuelle Suche nach Updates zu deaktivieren.`}:codexfastUpdateLocale.startsWith(`es`)?{label:`Desactivar actualizaciones automáticas`,description:`Detiene las futuras comprobaciones de actualizaciones en segundo plano sin desactivar la búsqueda manual.`}:codexfastUpdateLocale.startsWith(`pt`)?{label:`Desativar atualizações automáticas`,description:`Interrompe futuras verificações de atualização em segundo plano sem desativar a verificação manual.`}:codexfastUpdateLocale.startsWith(`it`)?{label:`Disattiva aggiornamenti automatici`,description:`Interrompe i futuri controlli degli aggiornamenti in background senza disattivare il controllo manuale.`}:codexfastUpdateLocale.startsWith(`ru`)?{label:`Отключить автоматические обновления`,description:`Останавливает последующие фоновые проверки обновлений, не отключая ручную проверку.`}:{label:`Disable automatic updates`,description:`Stop future background update checks without disabling manual Check for Updates.`};",
  "let codexfastUpdateChecked=codexfastDisableAutomaticUpdates??!1,codexfastUpdateOnChange;e[10]===t?codexfastUpdateOnChange=e[11]:(codexfastUpdateOnChange=e=>{B(t,j.disableAutomaticUpdates,e)},e[10]=t,e[11]=codexfastUpdateOnChange);let codexfastUpdateRow;return e[12]!==codexfastUpdateChecked||e[13]!==codexfastUpdateOnChange||e[14]!==codexfastUpdateMessages.label||e[15]!==codexfastUpdateMessages.description?(codexfastUpdateRow=(0,Z.jsx)(J,{label:codexfastUpdateMessages.label,description:codexfastUpdateMessages.description,control:(0,Z.jsx)(q,{checked:codexfastUpdateChecked,onChange:codexfastUpdateOnChange,ariaLabel:codexfastUpdateMessages.label})}),e[12]=codexfastUpdateChecked,e[13]=codexfastUpdateOnChange,e[14]=codexfastUpdateMessages.label,e[15]=codexfastUpdateMessages.description,e[16]=codexfastUpdateRow):codexfastUpdateRow=e[16],(0,Z.jsxs)(Z.Fragment,{children:[p,codexfastUpdateRow]})}",
].join("");

export const UPDATE_TARGET_SPECS = defineTargetSpecs(
  {
    id: "disable-automatic-updates-schema",
    label: "Disable automatic updates schema",
    needle: SETTINGS_SCHEMA_NEEDLE,
    guardedSignature: SETTINGS_SCHEMA_GUARDED_SIGNATURE,
    patchedSignature: SETTINGS_SCHEMA_PATCHED_SIGNATURE,
    applyReplacement:
      "$1disableAutomaticUpdates:$2({agentAccess:`read-write`,default:!1,description:`Whether background automatic update checks are disabled`,key:`disableAutomaticUpdates`,schema:$3}),",
  },
  {
    id: "disable-automatic-updates-setting",
    label: "Disable automatic updates setting",
    needle: GENERAL_SETTINGS_NEEDLE,
    guardedSignature: GENERAL_SETTINGS_GUARDED_SIGNATURE,
    patchedSignature: GENERAL_SETTINGS_PATCHED_SIGNATURE,
    applyReplacement: GENERAL_SETTINGS_REPLACEMENT,
  },
);
