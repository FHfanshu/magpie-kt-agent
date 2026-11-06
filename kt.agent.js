// magpie agent plugin: KohakuTerrarium (kt)
//
// kt is not one of magpie's built-in agents, so this file tells magpie how to
// put kt on the Agents page and what to write into kt's own config when a model
// is picked there.
//
// kt's model config lives in ~/.kohakuterrarium/llm_profiles.yaml:
//
//   version: 3
//   default_model: magpie/kt          <- the provider/preset kt starts on
//   backends:
//     magpie: {backend_type, base_url, api_key_env, provider_name}
//   presets:
//     magpie:
//       kt: {model, max_context, max_output, extra_body}
//
// A kt model reference is "<backend>/<preset>", split on the first "/" only, so
// the preset stays a plain name ("kt") and the gateway model id
// ("auto/deepseek-v4.1-flash") is only ever a YAML value, never part of a key
// path. magpie's writer takes dotted key paths; model ids carry dots
// ("gpt-6.1-sol"), so keying presets by model id would split a path in the
// wrong place.
//
// `model` below is therefore the preset's model field, not `default_model`:
// magpie writes the picked gateway model id there, and connect() writes the
// fixed `default_model: magpie/kt` that points at it.
//
// kt only takes its key from the env var a backend names (api_key_env), never a
// literal key in this file, so MAGPIE_API_KEY in ~/.kohakuterrarium/api_keys.yaml
// stays the one kt sends. magpie's own per-agent gateway key can't be written
// here; the local gateway answers any token.

const PRESET = "kt"
const BACKEND = "magpie"

export const agent = {
  id: "kt",
  name: "KohakuTerrarium",
  bin: "kt",
  dir: "~/.kohakuterrarium",
  config: "~/.kohakuterrarium/llm_profiles.yaml",
  format: "yaml",
  model: `presets.${BACKEND}.${PRESET}.model`,
  notice:
    "kt reads llm_profiles.yaml when a session starts: open a new kt session to use the new model.",
}

export function connect({ gateway, model }) {
  const preset = `presets.${BACKEND}.${PRESET}`
  const out = {
    default_model: `${BACKEND}/${PRESET}`,
    [`backends.${BACKEND}.backend_type`]: "openai",
    [`backends.${BACKEND}.base_url`]: gateway.v1,
    [`backends.${BACKEND}.api_key_env`]: "MAGPIE_API_KEY",
    [`backends.${BACKEND}.provider_name`]: BACKEND,
    [`${preset}.max_context`]: model?.context || 500000,
    [`${preset}.max_output`]: model?.output || 65536,
  }
  // kt's openai backend ignores a top-level reasoning_effort: only extra_body
  // reaches the provider unchanged. Written as one whole map, so switching kt
  // off takes the key with it instead of leaving an empty "extra_body: {}", and
  // a model without a high level clears whatever a previous one set.
  const efforts = (model && model.efforts) || []
  out[`${preset}.extra_body`] = efforts.includes("high")
    ? { reasoning_effort: "high" }
    : {}
  return out
}
