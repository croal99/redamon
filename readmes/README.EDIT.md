## 浏览器访问http://127.0.0.1:3000/graph?project=e40c9e707c424d928e57f6a92，是如何获得projectId

            
filePath: d:\ai\redamon\webapp\src\providers\ProjectProvider.tsx
          
浏览器访问 `http://127.0.0.1:3000/graph?project=e40c9e707c424d928e57f6a92` 时，`GraphPage` 自己并不解析 URL 参数；它通过 `useProject()` 从全局的 `ProjectProvider` 里拿到 `projectId`。

**获取链路（从 URL 到 projectId）**
- `GraphPage` 里直接解构：`const { projectId, ... } = useProject()`，所以 `projectId` 来源于 Provider 的 Context，而不是页面本身解析参数（见 [page.tsx:L34-L44](file:///d:/ai/redamon/webapp/src/app/graph/page.tsx#L34-L44)）。
- `ProjectProvider` 在初始化的 `useEffect` 中读取查询参数：`const urlProjectId = searchParams.get('project')`（见 [ProjectProvider.tsx:L46-L52](file:///d:/ai/redamon/webapp/src/providers/ProjectProvider.tsx#L46-L52)）。
- 它会做回退：`projectIdToLoad = urlProjectId || savedProjectId`，也就是**优先用 URL 的 `project` 参数**，没有才用 `localStorage` 里的 `redamon-current-project`（同上链接）。
- 如果 `projectIdToLoad` 存在，就调用 `fetch(/api/projects/${projectIdToLoad})` 拉取项目详情，成功后 `setCurrentProjectState({ id: project.id, ... })`（见 [ProjectProvider.tsx:L58-L83](file:///d:/ai/redamon/webapp/src/providers/ProjectProvider.tsx#L58-L83)）。
- Context 里真正暴露给页面的 `projectId` 是：`projectId: currentProject?.id || null`（见 [ProjectProvider.tsx:L125-L133](file:///d:/ai/redamon/webapp/src/providers/ProjectProvider.tsx#L125-L133)）。

**所以你这个 URL 是怎么拿到 projectId 的？**
- 进入 `/graph?project=e40c...` 后：`ProjectProvider` 从 `searchParams.get('project')` 读到 `e40c...` → 请求 `/api/projects/e40c...` → 成功后把 `currentProject.id` 设为 `e40c...` → `GraphPage` 通过 `useProject()` 得到 `projectId=e40c...`。

补充一点：在 Provider 拉取完成前，`projectId` 会短暂是 `null`，因此 `GraphPage` 里很多 hook 都用 `enabled: !!projectId` 或 `if (!projectId) return` 来避免空值请求（例如 [page.tsx:L145-L160](file:///d:/ai/redamon/webapp/src/app/graph/page.tsx#L145-L160)、[page.tsx:L191-L214](file:///d:/ai/redamon/webapp/src/app/graph/page.tsx#L191-L214)）。

## 禁止访问Wellcome

webapp\src\components\layout\DisclaimerGate\DisclaimerGate.tsx

line 111: 
```
  // 已同意，直接渲染子组件
  return <>{children}</>
  if (isAccepted) {
  }
```

## 禁止GVM Scan

webapp\src\app\graph\components\GraphToolbar\GraphToolbar.tsx

line 365: 
```
  { false && (
```

## 启动侦察相关

webapp\src\hooks\useReconStatus.ts
webapp\src\app\api\recon\[projectId]\start\route.ts
recon_orchestrator\api.py
recon_orchestrator\container_manager.py
