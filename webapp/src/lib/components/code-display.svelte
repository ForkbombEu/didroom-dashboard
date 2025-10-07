<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { codeToHtml } from 'shiki';

	//

	export let code: string;
	export let lang: 'json' | 'gherkin';

	let highlightedCode = '';

	$: codeToHtml(code, {
		lang: lang,
		theme: 'dracula-soft'
	}).then((html) => {
		highlightedCode = html;
	});
</script>

<div
	class="text-sm [&>pre]:max-h-[400px] [&>pre]:min-h-[100px] [&>pre]:overflow-y-auto [&>pre]:rounded-md [&>pre]:p-4 [&>pre]:font-mono"
>
	{@html highlightedCode}
</div>
