<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import { Checkbox, Form, createForm, Select as SelectInput, Relations } from '$lib/forms';
	import Input from '$lib/forms/fields/input.svelte';
	import Textarea from '$lib/forms/fields/textarea.svelte';
	import { m } from '$lib/i18n';
	import { pb } from '$lib/pocketbase';
	import { getCollectionSchema } from '$lib/pocketbase/schema';
	import {
		Collections,
		TemplatesTypeOptions,
		type TemplatesResponse,
		type TemplatesRecord,
		type ServicesResponse
	} from '$lib/pocketbase/types.js';
	import { fieldsSchemaToZod } from '$lib/pocketbaseToZod';
	import { A, Alert, Button, Hr, Select, type SelectOptionType } from 'flowbite-svelte';
	import JSONSchemaInput from './JSONSchemaInput.svelte';
	import SubmitButton from '$lib/forms/submitButton.svelte';
	import FormError from '$lib/forms/formError.svelte';
	import { createEventDispatcher } from 'svelte';
	import CodeEditorField from './codeEditorField.svelte';
	import { createTypeProp } from '$lib/utils/typeProp.js';
	import type { ObjectSchema } from '$lib/jsonSchema/types';
	import ClaimsEditor from './claims-editor.svelte';
	import {
		getClaimInputsFromObjectSchema,
		getClaimInputsFromTemplate,
		type ClaimInput
	} from './claims';
	import * as dcql from './dcql';

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

	/* issuer */

	let selectedIssuanceFlow: ServicesResponse | undefined = undefined;
	let claims: ClaimInput[] = getClaimInputsFromTemplate(initialData);
	let issUrl: string | undefined = undefined;
	$: $form['claims'] = JSON.stringify(claims);

	// At startup:
	if ($form.issuance_flow && !selectedIssuanceFlow) {
		fetchFlowAndClaims($form.issuance_flow).then(({ flow, claims: cs, issEndpoint }) => {
			selectedIssuanceFlow = flow;
			issUrl = issEndpoint;
			if (claims.length === 0) claims = cs; // Set claims only if they do not come from initial data
		});
	}

	async function fetchFlowAndClaims(flowId: string) {
		const flow = await pb
			.collection(Collections.Services)
			.getOne<ServicesResponse>(flowId, { expand: 'credential_issuer' });
		const publicData = await pb
			.collection(Collections.TemplatesPublicData)
			.getOne(flow.credential_template);

		const credentialSchema = publicData.schema as ObjectSchema;
		const claims = getClaimInputsFromObjectSchema(credentialSchema);
		const issEndpoint = (flow.expand as any).credential_issuer.endpoint;
		return { flow, claims, issEndpoint };
	}

	async function handleFlowSelection(flowId: string | undefined) {
		if (!flowId) return;
		fetchFlowAndClaims(flowId).then(({ flow, claims: cs , issEndpoint }) => {
			selectedIssuanceFlow = flow;
			claims = cs;
			issUrl = issEndpoint;
		});
	}

	$: if (claims && selectedIssuanceFlow && issUrl) {
		$form['dcql_query'] = JSON.stringify(
			dcql.makeFromIssuanceFlowAndClaims(selectedIssuanceFlow, claims, issUrl),
			null,
			2
		);
	}

	$: if ( $form['type'] === TemplatesTypeOptions.verification ) {
		$form['schema'] = "";
	}

	/* Code placeholders */

	addCodePlaceholders();

	function addCodePlaceholders() {
		if (!$form['zencode_script']) $form['zencode_script'] = '# Add code here';
		if (!$form['zencode_data']) $form['zencode_data'] = `{}`;
		if (!$form['dcql_query']) $form['dcql_query'] = JSON.stringify(dcql.getExample(), null, 2);
	}

	/* Utils */

	$: type = getType($form);

	function getType(form: typeof $form | undefined | null) {
		if (form) return $form['type'];
		else return undefined;
	}

	function formatServiceRecord(r: ServicesResponse) {
		return `${r.display_name} | ${r.type_name}`;
	}

	const servicesType = createTypeProp<ServicesResponse>();
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
		<SectionTitle tag="h5" title={m.Load_preset()} description={m.load_preset_description()} />
		{#await presetsPromise then presets}
			<Select items={presets} bind:value={preset} placeholder={m.Select_option()} />
		{:catch _}
			<Alert color="yellow">
				<p>{m.error_loading_presets()}</p>
			</Alert>
		{/await}
	</div>

	{#if $form['type'] !== TemplatesTypeOptions.verification}
		<div class="space-y-8">
			<SectionTitle
				tag="h5"
				title="{m.Form_structure()} *"
				description={m.form_structure_description()}
			/>

			<JSONSchemaInput {superform} field="schema" />
		</div>
	{/if}

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

	{#if $form['type'] === TemplatesTypeOptions.verification}
		<div class="space-y-8">
			<SectionTitle tag="h5" title="{m.dcql_query()}*" description={m.dcql_query()} />

			<Relations
				recordType={servicesType}
				collection={Collections.Services}
				field="issuance_flow"
				options={{
					label: m.Issuance_flows(),
					inputMode: 'select',
					displayFields: ['display_name', 'type_name'],
					placeholder: m.Select_option(),
					formatRecord: formatServiceRecord,
					onChange: handleFlowSelection
				}}
				{superform}
			></Relations>

			<ClaimsEditor bind:claims />

			<div class="relative">
				<CodeEditorField
					{superform}
					field="dcql_query"
					label="{m.dcql_query()} (JSON)"
					lang="json"
				/>
				<!-- Overlay blocks editing -->
				<div class="absolute inset-0 z-10" style="pointer-events: all;"></div>
			</div>
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
