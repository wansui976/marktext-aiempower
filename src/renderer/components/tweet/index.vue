<template>
  <div class="tweet-dialog">
    <el-dialog
      :visible.sync="showTweetDialog"
      :show-close="false"
      :modal="true"
      custom-class="ag-dialog-table"
      width="450px"
    >
      <div slot="title" class="title">
        <span>Send us feedback via tweet</span>
      </div>
      <div class="body">
        <div class="feeling">
          <div>What's your experience feelings?</div>
          <ul>
            <li
              :class="{ 'active': selectedFace === 'smile' }"
              @click="faceClick('smile')"
            >
              <lucide-icon name="smile" :size="22"></lucide-icon>
            </li>
            <li
              :class="{ 'active': selectedFace === 'sad' }"
              @click="faceClick('sad')"
            >
              <lucide-icon name="frown" :size="22"></lucide-icon>
            </li>
          </ul>
        </div>
        <div class="feedback">
          <div>Tell us your feedback?</div>
          <textarea
            cols="30" rows="10" v-model="value" ref="textarea"
          ></textarea>
        </div>
        <div class="buttons">
          <a
            href="javascript:;"
            class="github"
            @click="reportViaGithub"
          >
            <lucide-icon name="github" :size="16"></lucide-icon>
            Report bug or feature request via github
          </a>
          <a
            href="javascript:;"
            class="twitter"
            :class="{ 'active': value }"
            @click="reportViaTwitter"
          >
            <lucide-icon name="twitter" :size="16"></lucide-icon>
            Tweet
          </a>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { shell } from 'electron'
import bus from '../../bus'

export default {
  data () {
    return {
      showTweetDialog: false,
      value: '',
      selectedFace: 'smile'
    }
  },
  created () {
    bus.$on('tweetDialog', this.showDialog)
  },
  beforeDestroy () {
    bus.$off('tweetDialog', this.showDialog)
  },
  methods: {
    showDialog () {
      this.showTweetDialog = true
      this.value = ''
      bus.$emit('editor-blur')
      this.$nextTick(() => {
        this.$refs.textarea.focus()
      })
    },
    faceClick (name) {
      this.selectedFace = name
    },
    reportViaGithub () {
      shell.openExternal('https://github.com/marktext/marktext/issues/new')
    },
    reportViaTwitter () {
      const { value, selectedFace } = this
      if (!value) return
      const origin = 'https://twitter.com/intent/tweet'

      const params = {
        via: 'marktextme',
        url: encodeURI('https://github.com/marktext/marktext/'),
        text: value
      }

      if (selectedFace === 'smile') params.hashtags = 'happyMarkText'

      shell.openExternal(`${origin}?${Object.keys(params).map(key => `${key}=${params[key]}`).join('&')}`)
      this.showTweetDialog = false
    }
  }
}
</script>

<style>
  .tweet-dialog {
    color: var(--text-secondary);
    & .title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }
    & .el-dialog__body {
      color: var(--text-secondary);
    }
  }
  .tweet-dialog .feeling, .tweet-dialog .feedback {
    font-size: var(--font-size-md);
  }
  .tweet-dialog .feeling {
    & ul {
      display: flex;
      gap: var(--space-2);
      list-style: none;
      margin: var(--space-2) 0 var(--space-4);
      padding: 0;
      & li {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        color: var(--text-muted);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
      }
      & li:hover {
        background: var(--surface-hover);
      }
      & li.active {
        color: #f5b301;
        background: var(--surface-active);
      }
    }
  }
  .tweet-dialog .feedback {
    & > textarea {
      width: 100%;
      box-sizing: border-box;
      margin: var(--space-2) 0 var(--space-4);
      padding: var(--space-2) var(--space-3);
      resize: none;
      outline: none;
      border: 1px solid var(--border-subtle);
      background: var(--surface-input);
      color: var(--editorColor);
      border-radius: var(--radius-md);
      font-family: var(--font-ui);
      font-size: var(--font-size-md);
      height: 96px;
      transition: border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
      &:focus {
        border-color: var(--themeColor);
        box-shadow: var(--focus-ring);
      }
    }
  }
  .tweet-dialog .buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .tweet-dialog .buttons a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
  }
  .tweet-dialog .buttons a.twitter {
    height: var(--control-height);
    padding: 0 var(--space-3);
    font-weight: 500;
    color: var(--text-muted);
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
    box-sizing: border-box;
    cursor: not-allowed;
  }
  .tweet-dialog .buttons a.twitter.active {
    background: var(--themeColor);
    color: #fff;
    cursor: pointer;
  }
  .tweet-dialog .buttons a.github {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    &:hover {
      color: var(--text-primary);
    }
  }
</style>
