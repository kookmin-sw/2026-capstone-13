---
description: 화면에 i18n t() 적용 및 GitHub push
---
// turbo-all

1. 미적용 파일 확인
```bash
cd /Users/kimyoungil/helpboys/frontend && grep -rL "useTranslation\|i18n\|t('" app/ --include="*.tsx" | sort
```

2. 각 파일에 `import { useTranslation } from 'react-i18next';` 추가 후 `const { t } = useTranslation();` 훅 사용

3. 하드코딩된 한국어 문자열을 `t('namespace.key')` 로 교체

4. 새 키가 있으면 locales/ 7개 JSON 파일에 추가

5. commit & push
```bash
cd /Users/kimyoungil/helpboys/frontend && git add -A && git commit -m "[feat] 나머지 화면 i18n t() 적용" && git push origin main
```
