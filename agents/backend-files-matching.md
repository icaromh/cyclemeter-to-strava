# Agente Backend Files / Matching

Branch/worktree alvo: `codex/agent-files-matching` em `../strava-sync-files`.

Implemente ingestão de arquivos e matching:

- Aceite `.gpx`, `.tcx`, `.fit`.
- Salve em disco local temporário.
- Calcule hash.
- Extraia `startDate`, `distanceMeters`, `durationSeconds` e `sportType` quando possível.
- Persista checks e retorne o contrato documentado.

Nao implemente UI nem OAuth.

Critérios de aceite:

- Fixtures GPX/TCX/FIT cobrem sucesso e erro de parse.
- Matching classifica `match_confirmed`, `match_probable`, `not_found`, `parse_error`.
- Duplicata por hash não cria arquivos duplicados para o mesmo usuário.

