export default {
  en: {
    common: {
      ai: 'AI',
      save: 'Save',
      clear: 'Clear',
      retry: 'Retry',
      stop: 'Stop',
      send: 'Send',
      new: 'New',
      settings: 'Settings',
      sessions: 'Sessions',
      workspace: 'Workspace'
    },
    preferences: {
      general: {
        language: 'User interface language'
      }
    },
    ai: {
      header: {
        newChat: 'New chat',
        more: 'More',
        exportMarkdown: 'Export Markdown'
      },
      settings: {
        provider: 'Provider',
        providerHint: 'Choose a provider compatible with Anthropic Messages API or OpenAI Chat Completions.',
        apiKey: '{provider} API Key',
        apiKeyHintAnthropic: 'Falls back to {env} env var or ANTHROPIC_AUTH_TOKEN.',
        apiKeyHintOpenAI: 'Falls back to {env} env var. Local OpenAI-compatible endpoints may leave this empty.',
        baseUrl: 'Base URL',
        baseUrlHint: 'Optional. Falls back to {env} env var. Currently using {value}.',
        model: 'Model',
        modelHint: 'Optional. Falls back to {env} env var. Currently using {value}.',
        contextLimit: 'Context window (tokens)',
        contextLimitHint: 'Used for the token budget display. Default 128000. Set to your model\'s max context size.',
        writingStyle: 'Writing style',
        personaPlaceholder: 'e.g. Reply in Chinese. Prefer concise bullet points over long paragraphs. Avoid emoji. Use technical Chinese terms (use English words for code/API names).',
        personaHint: 'Optional. Injected into every AI prompt. Describe your tone, format preferences, language, jargon to avoid, etc.',
        openAICompatible: 'OpenAI compatible',
        openAIPlaceholder: 'sk-... or empty for local endpoint',
        anthropicPlaceholder: 'sk-ant-...'
      },
      sessions: {
        title: 'Sessions',
        empty: 'No sessions for this document yet.',
        delete: 'Delete session',
        deleteConfirm: 'Delete this AI session?',
        newChat: 'New chat'
      },
      empty: {
        title: 'Ask about this document',
        copy: 'Use a writing template below, or ask a direct question about the Markdown you are editing.'
      },
      messages: {
        you: 'You',
        assistant: 'AI',
        compacted: 'Compacted conversation',
        stopped: 'Stopped. Your message is preserved.'
      },
      undo: {
        lastEdit: 'Undo last edit',
        stack: '{count} edit in stack',
        stacks: '{count} edits in stack'
      },
      editPreview: {
        review: 'Review Changes',
        proposed: 'Proposed edit',
        reject: 'Reject',
        accept: 'Accept',
        folds: 'folds',
        footnote: 'Apply this change to the current Markdown document only after you review the highlighted lines.'
      },
      composer: {
        longConversation: 'Conversation is getting long. Consider compacting it.',
        compacting: 'Compacting...',
        compact: 'Compact',
        selectedLine: '{count} line selected',
        selectedLines: '{count} lines selected',
        quickPrompts: 'Quick prompts',
        setApiKey: 'Set an API key to start.',
        replying: '{provider} is replying...',
        placeholder: 'Ask AI about this document',
        tokenUsage: '{used} / {limit}',
        tokenTitle: '{used} tokens used out of an estimated {limit} context window'
      },
      modes: {
        title: 'Modes',
        hint: 'Select how AI should edit',
        ask: {
          label: 'Ask before edits',
          shortLabel: 'Ask before edits',
          description: 'AI will ask for approval before making each edit'
        },
        auto: {
          label: 'Edit automatically',
          shortLabel: 'Edit automatically',
          description: 'AI will edit your selected text or the whole file'
        },
        plan: {
          label: 'Plan mode',
          shortLabel: 'Plan mode',
          description: 'AI will explore the document and present a plan before editing'
        }
      },
      templates: {
        polish: {
          label: 'Polish',
          prompt: 'Review this Markdown document and improve clarity, wording, and flow while preserving the original meaning and structure. Suggest concrete edits or apply them if I ask.'
        },
        continue: {
          label: 'Continue',
          prompt: 'Continue writing this Markdown document in the same tone and structure. Focus on the next most natural section and keep the formatting consistent.'
        },
        condense: {
          label: 'Condense',
          prompt: 'Condense this Markdown document while preserving the key points, structure, and important details. Remove repetition and tighten wording.'
        },
        summary: {
          label: 'Summarize',
          prompt: 'Summarize this Markdown document into a concise structured overview with headings and bullet points.'
        },
        structure: {
          label: 'Structure',
          prompt: 'Review the structure of this Markdown document. Suggest a clearer outline, section order, and headings, with concrete recommendations.'
        },
        mermaid: {
          label: 'Diagram',
          prompt: 'Read the current document and generate a Mermaid diagram that visualizes its structure, relationships, or key concepts. Output the diagram inside a ```mermaid code fence. If the user previously selected text, focus the diagram on that selection.'
        }
      },
      tools: {
        get_document: 'Reading current document',
        apply_edit: 'Editing document',
        replace_text: 'Replacing text',
        insert_text: 'Inserting text',
        read_file: 'Reading file',
        list_directory: 'Listing directory'
      },
      export: {
        saved: 'Chat exported to {path}',
        failed: 'Failed to export chat: {message}',
        title: 'AI Chat Export',
        document: 'Document',
        exportedAt: 'Exported at',
        tool: 'Tool',
        status: 'Status'
      }
    }
  },
  'zh-CN': {
    common: {
      ai: 'AI',
      save: '保存',
      clear: '清除',
      retry: '重试',
      stop: '停止',
      send: '发送',
      new: '新建',
      settings: '设置',
      sessions: '会话',
      workspace: '工作区'
    },
    preferences: {
      general: {
        language: '界面语言'
      }
    },
    ai: {
      header: {
        newChat: '新建会话',
        more: '更多',
        exportMarkdown: '导出 Markdown'
      },
      settings: {
        provider: '服务商',
        providerHint: '选择兼容 Anthropic Messages API 或 OpenAI Chat Completions 的服务商。',
        apiKey: '{provider} API Key',
        apiKeyHintAnthropic: '默认读取 {env} 环境变量，也支持 ANTHROPIC_AUTH_TOKEN。',
        apiKeyHintOpenAI: '默认读取 {env} 环境变量。本地 OpenAI 兼容服务可以留空。',
        baseUrl: 'Base URL',
        baseUrlHint: '可选。默认读取 {env} 环境变量。当前使用 {value}。',
        model: '模型',
        modelHint: '可选。默认读取 {env} 环境变量。当前使用 {value}。',
        contextLimit: '上下文窗口 (tokens)',
        contextLimitHint: '用于 token 用量显示。默认 128000。设置为你的模型最大上下文长度。',
        writingStyle: '写作风格',
        personaPlaceholder: '例如：用中文回复；优先使用简洁要点，避免长段落；不要使用 emoji；代码/API 名称保留英文。',
        personaHint: '可选。会注入到每次 AI 提示中，可描述语气、格式偏好、术语习惯等。',
        openAICompatible: 'OpenAI 兼容',
        openAIPlaceholder: 'sk-... 或本地端点留空',
        anthropicPlaceholder: 'sk-ant-...'
      },
      sessions: {
        title: '会话',
        empty: '当前文档还没有会话。',
        delete: '删除会话',
        deleteConfirm: '确定删除这个 AI 会话吗？',
        newChat: '新建会话'
      },
      empty: {
        title: '询问当前文档',
        copy: '可以使用下面的写作模板，也可以直接询问正在编辑的 Markdown。'
      },
      messages: {
        you: '你',
        assistant: 'AI',
        compacted: '已压缩对话',
        stopped: '已停止，你的消息已保留。'
      },
      undo: {
        lastEdit: '撤销上次编辑',
        stack: '栈中有 {count} 次编辑',
        stacks: '栈中有 {count} 次编辑'
      },
      editPreview: {
        review: '审阅修改',
        proposed: '拟应用编辑',
        reject: '拒绝',
        accept: '接受',
        folds: '处折叠',
        footnote: '请先检查高亮行，再将这个修改应用到当前 Markdown 文档。'
      },
      composer: {
        longConversation: '对话较长，建议压缩。',
        compacting: '压缩中...',
        compact: '压缩',
        selectedLine: '已选择 {count} 行',
        selectedLines: '已选择 {count} 行',
        quickPrompts: '快速提示',
        setApiKey: '先设置 API Key 后开始。',
        replying: '{provider} 正在回复...',
        placeholder: '询问当前文档',
        tokenUsage: '{used} / {limit}',
        tokenTitle: '已使用约 {used} tokens，估算上下文窗口为 {limit}'
      },
      modes: {
        title: '模式',
        hint: '选择 AI 如何编辑',
        ask: {
          label: '编辑前询问',
          shortLabel: '编辑前询问',
          description: 'AI 每次编辑前都会请求确认'
        },
        auto: {
          label: '自动编辑',
          shortLabel: '自动编辑',
          description: 'AI 会编辑选中文本或整篇文档'
        },
        plan: {
          label: '计划模式',
          shortLabel: '计划模式',
          description: 'AI 会先探索文档并给出编辑计划'
        }
      },
      templates: {
        polish: {
          label: '润色',
          prompt: '检查这篇 Markdown 文档，在保留原意和结构的前提下提升表达、清晰度和行文流畅度。请给出具体修改建议；如果我要求，也可以直接应用。'
        },
        continue: {
          label: '续写',
          prompt: '按照相同语气和结构继续写这篇 Markdown 文档。聚焦下一个自然段落或章节，并保持格式一致。'
        },
        condense: {
          label: '压缩',
          prompt: '在保留关键观点、结构和重要细节的前提下压缩这篇 Markdown 文档，去掉重复内容并收紧措辞。'
        },
        summary: {
          label: '总结',
          prompt: '将这篇 Markdown 文档总结成简洁、结构化的概览，包含标题和要点。'
        },
        structure: {
          label: '结构',
          prompt: '检查这篇 Markdown 文档的结构，提出更清晰的大纲、章节顺序和标题建议，并给出具体调整方案。'
        },
        mermaid: {
          label: '图示',
          prompt: '读取当前文档，生成一个 Mermaid 图来可视化它的结构、关系或关键概念。请把图放在 ```mermaid 代码块中。如果用户之前选中了文本，请优先围绕选区生成。'
        }
      },
      tools: {
        get_document: '读取当前文档',
        apply_edit: '编辑文档',
        replace_text: '替换文本',
        insert_text: '插入文本',
        read_file: '读取文件',
        list_directory: '列出目录'
      },
      export: {
        saved: '对话已导出到 {path}',
        failed: '导出对话失败：{message}',
        title: 'AI 对话导出',
        document: '文档',
        exportedAt: '导出时间',
        tool: '工具',
        status: '状态'
      }
    }
  }
}
