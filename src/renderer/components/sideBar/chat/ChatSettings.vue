<template>
  <div class="settings-panel">
    <label>{{ $t('ai.settings.provider') }}</label>
    <select v-model="localProvider">
      <option value="anthropic">Anthropic</option>
      <option value="openai">{{ $t('ai.settings.openAICompatible') }}</option>
    </select>
    <div class="settings-hint">
      {{ $t('ai.settings.providerHint') }}
    </div>

    <label>{{ $t('ai.settings.apiKey', { provider: providerLabel }) }}</label>
    <input
      type="password"
      v-model="localApiKey"
      spellcheck="false"
      autocomplete="off"
      :placeholder="apiKeyPlaceholder"
    />
    <div class="settings-hint">
      <span v-if="currentProvider === 'anthropic'">{{ $t('ai.settings.apiKeyHintAnthropic', { env: apiKeyEnvName }) }}</span>
      <span v-else>{{ $t('ai.settings.apiKeyHintOpenAI', { env: apiKeyEnvName }) }}</span>
    </div>

    <label>{{ $t('ai.settings.baseUrl') }}</label>
    <input
      type="text"
      v-model="localBaseUrl"
      spellcheck="false"
      autocomplete="off"
      :placeholder="baseUrlPlaceholder"
    />
    <div class="settings-hint">
      {{ $t('ai.settings.baseUrlHint', { env: baseUrlEnvName, value: resolvedBaseUrl }) }}
    </div>

    <label>{{ $t('ai.settings.model') }}</label>
    <input
      type="text"
      v-model="localModel"
      spellcheck="false"
      autocomplete="off"
      :placeholder="modelPlaceholder"
    />
    <div class="settings-hint">
      {{ $t('ai.settings.modelHint', { env: modelEnvName, value: resolvedModel }) }}
    </div>

    <label>{{ $t('ai.settings.contextLimit') }}</label>
    <input
      type="number"
      v-model.number="localContextLimit"
      min="4096"
      max="2000000"
      step="1000"
      :placeholder="128000"
    />
    <div class="settings-hint">
      {{ $t('ai.settings.contextLimitHint') }}
    </div>

    <label>{{ $t('ai.settings.writingStyle') }}</label>
    <textarea
      class="settings-persona"
      v-model="localPersona"
      spellcheck="false"
      rows="4"
      :placeholder="personaPlaceholder"
    ></textarea>
    <div class="settings-hint">
      {{ $t('ai.settings.personaHint') }}
    </div>

    <div class="settings-actions">
      <button type="button" @click="save">{{ $t('common.save') }}</button>
      <button v-if="hasStoredValues" type="button" class="ghost" @click="$emit('clear')">{{ $t('common.clear') }}</button>
    </div>
  </div>
</template>

<script>
import { PROVIDERS, normalizeProvider, resolveBaseUrl, resolveModel } from '../../../node/claudeApi'

export default {
  props: {
    providerInput: { type: String, default: 'anthropic' },
    apiKeyInput: { type: String, default: '' },
    baseUrlInput: { type: String, default: '' },
    modelInput: { type: String, default: '' },
    personaInput: { type: String, default: '' },
    contextLimitInput: { type: Number, default: 128000 },
    hasStoredValues: { type: Boolean, default: false }
  },
  data () {
    return {
      localProvider: this.providerInput,
      localApiKey: this.apiKeyInput,
      localBaseUrl: this.baseUrlInput,
      localModel: this.modelInput,
      localPersona: this.personaInput,
      localContextLimit: this.contextLimitInput
    }
  },
  computed: {
    currentProvider () {
      return normalizeProvider(this.localProvider)
    },
    providerLabel () {
      return this.currentProvider === PROVIDERS.OPENAI ? 'OpenAI' : 'Anthropic'
    },
    apiKeyPlaceholder () {
      return this.currentProvider === PROVIDERS.OPENAI ? 'sk-... or empty for local endpoint' : 'sk-ant-...'
    },
    apiKeyEnvName () {
      return this.currentProvider === PROVIDERS.OPENAI ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
    },
    baseUrlEnvName () {
      return this.currentProvider === PROVIDERS.OPENAI ? 'OPENAI_BASE_URL' : 'ANTHROPIC_BASE_URL'
    },
    modelEnvName () {
      return this.currentProvider === PROVIDERS.OPENAI ? 'OPENAI_MODEL' : 'ANTHROPIC_MODEL'
    },
    baseUrlPlaceholder () {
      return resolveBaseUrl('', this.currentProvider)
    },
    resolvedBaseUrl () {
      return resolveBaseUrl(this.localBaseUrl, this.currentProvider)
    },
    modelPlaceholder () {
      return resolveModel('', this.currentProvider)
    },
    resolvedModel () {
      return resolveModel(this.localModel, this.currentProvider)
    },
    personaPlaceholder () {
      return this.$t('ai.settings.personaPlaceholder')
    }
  },
  watch: {
    providerInput (val) { this.localProvider = val },
    apiKeyInput (val) { this.localApiKey = val },
    baseUrlInput (val) { this.localBaseUrl = val },
    modelInput (val) { this.localModel = val },
    personaInput (val) { this.localPersona = val },
    contextLimitInput (val) { this.localContextLimit = val }
  },
  methods: {
    save () {
      this.$emit('save', {
        provider: this.localProvider,
        apiKey: this.localApiKey,
        baseUrl: this.localBaseUrl,
        model: this.localModel,
        persona: this.localPersona,
        contextLimit: this.localContextLimit
      })
    }
  }
}
</script>
