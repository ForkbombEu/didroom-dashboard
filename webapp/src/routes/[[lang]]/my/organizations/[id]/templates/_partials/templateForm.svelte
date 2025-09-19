<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import { Checkbox, Form, createForm, Select as SelectInput, FieldController } from '$lib/forms';
	import Input from '$lib/forms/fields/input.svelte';
	import Textarea from '$lib/forms/fields/textarea.svelte';
	import { m } from '$lib/i18n';
	import { pb } from '$lib/pocketbase';
	import { getCollectionSchema } from '$lib/pocketbase/schema';
	import {
		Collections,
		TemplatesTypeOptions,
		type TemplatesResponse,
		type TemplatesRecord
	} from '$lib/pocketbase/types';
	import { fieldsSchemaToZod } from '$lib/pocketbaseToZod';
	import { A, Alert, Button, Hr, Select, type SelectOptionType } from 'flowbite-svelte';
	import JSONSchemaInput from './JSONSchemaInput.svelte';
	import SubmitButton from '$lib/forms/submitButton.svelte';
	import FormError from '$lib/forms/formError.svelte';
	import { createEventDispatcher } from 'svelte';
	import CodeEditorField from './codeEditorField.svelte';

	//

	export let templateId: string | undefined = undefined;
	export let initialData: Partial<TemplatesRecord> = {
		type: TemplatesTypeOptions.issuance
	};
	export let hideCancelButton = false;

	//

	let schema = fieldsSchemaToZod(getCollectionSchema(Collections.Templates)!.schema);

	let dispatch = createEventDispatcher<{ success: TemplatesResponse; cancel: {} }>();

	let superform = createForm(
		schema,
		async (e) => {
			console.log(e.form.data);
			let record: TemplatesResponse;
			if (templateId) {
				record = await pb.collection('templates').update(templateId, e.form.data);
			} else {
				record = await pb.collection('templates').create(e.form.data);
			}
			dispatch('success', record);
		},
		initialData,
		{
			dataType: 'json'
		}
	);

	const { form } = superform;

	/* Preset application */

	const presetsPromise: Promise<SelectOptionType<TemplatesRecord>[]> = pb
		.collection('templates')
		.getFullList({ filter: 'is_preset = true' })
		.then((templates) => templates.map((t) => ({ name: t.name, value: t })));

	let preset: TemplatesRecord | undefined = undefined;
	$: handlePresetSelection(preset);

	function handlePresetSelection(selectedPreset: TemplatesRecord | undefined) {
		if (!selectedPreset) return;
		applyPreset(selectedPreset);
		preset = undefined;
	}

	function applyPreset({ zencode_data, zencode_script, schema }: TemplatesRecord) {
		if (zencode_script) $form['zencode_script'] = zencode_script;
		if (zencode_data) $form['zencode_data'] = zencode_data;
		$form['schema'] = JSON.stringify(schema, null, 4);
	}

	// Utils

	$: type = getType($form);

	function getType(form: typeof $form | undefined | null) {
		if (form) return $form['type'];
		else return undefined;
	}

	// setup code placeholders
	const dcqlQueryExample = JSON.stringify(
		{
			credentials: [
				{
					id: 'my_credential',
					format: 'dc+sd-jwt',
					meta: {
						vct_values: ['https://credentials.example.com/identity_credential']
					},
					claims: [
						{ path: ['last_name'] },
						{ path: ['first_name'] },
						{ path: ['address', 'street_address'] }
					]
				}
			]
		},
		null,
		2
	);

	addCodePlaceholders();

	function addCodePlaceholders() {
		if (!$form['zencode_script']) $form['zencode_script'] = '# Add code here';
		if (!$form['zencode_data']) $form['zencode_data'] = `{}`;
		if (!$form['dcql_query']) $form['dcql_query'] = dcqlQueryExample;
	}
</script>

<Form {superform} className="space-y-12" showRequiredIndicator>
	<div class="space-y-8">
		<SectionTitle
			tag="h5"
			title={m.Basic_info()}
			description={m.template_form_basic_info_description()}
		/>

		{#if !initialData['type']}
			<SelectInput
				{superform}
				field="type"
				options={{ options: Object.values(TemplatesTypeOptions) }}
			/>
		{/if}

		<Input {superform} field="name" options={{ placeholder: m.template_form_name_placeholder() }} />

		<Textarea
			{superform}
			field="description"
			options={{ placeholder: m.template_form_description_placeholder() }}
		/>
	</div>

	<div class="space-y-4">
		<SectionTitle tag="h5" title="Load preset" description={m.load_preset_description()} />
		{#await presetsPromise then presets}
			<Select items={presets} bind:value={preset} placeholder={m.Select_option()} />
		{:catch _}
			<Alert color="yellow">
				<p>{m.error_loading_presets()}</p>
			</Alert>
		{/await}
	</div>

	<div class="space-y-8">
		<SectionTitle
			tag="h5"
			title="{m.Form_structure()} *"
			description={m.form_structure_description()}
		/>

		<JSONSchemaInput {superform} field="schema" />
	</div>

	<div class="space-y-8">
		<SectionTitle tag="h5" title="{m.Custom_code()}*" description={m.custom_code_description()} />
		<Alert>
			<div class="flex justify-between">
				<p>Test your code with the slangroom editor!</p>
				<a
					href="https://dyne.org/slangroom/playground/"
					class=" underline hover:no-underline"
					target="_blank"
				>
					Slangroom Playground [↗]
				</a>
			</div>
		</Alert>
		<CodeEditorField {superform} field="zencode_script" label={m.zencode_script()} lang="gherkin" />
		<CodeEditorField {superform} field="zencode_data" label={m.zencode_data()} lang="json" />
	</div>

	{#if (initialData['type'] && initialData['type'] === TemplatesTypeOptions.verification) || $form['type'] === TemplatesTypeOptions.verification}
		<div class="space-y-8">
			<SectionTitle tag="h5" title="{m.dcql_query()}*" />

			<CodeEditorField {superform} field="dcql_query" label="{m.dcql_query()} (JSON)" lang="json" />
		</div>
	{/if}

	<div class="space-y-8">
		<SectionTitle tag="h5" title={m.Advanced_settings()} />

		<Checkbox field="public" {superform}>
			{m.Is_public()}: {m.template_is_public_description()}
		</Checkbox>
	</div>

	<Hr />

	<FormError />

	<div class="flex justify-end gap-2">
		{#if !hideCancelButton}
			<Button color="alternative" on:click={() => dispatch('cancel', {})}>
				{m.Cancel()}
			</Button>
		{/if}
		<SubmitButton>{templateId ? m.Update_template() : m.Create_template()}</SubmitButton>
	</div>
</Form>
