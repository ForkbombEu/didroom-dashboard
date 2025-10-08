<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import Drawer from '$lib/components/drawer.svelte';
	import Icon from '$lib/components/icon.svelte';
	import ImagePreview from '$lib/components/imagePreview.svelte';
	import PageCard from '$lib/components/pageCard.svelte';
	import PortalWrapper from '$lib/components/portalWrapper.svelte';
	import SectionTitle from '$lib/components/sectionTitle.svelte';
	import { createToggleStore } from '$lib/components/utils/toggleStore';
	import {
		Checkbox,
		FieldWrapper,
		Form,
		Input,
		Relations,
		Select,
		SubmitButton,
		Textarea,
		createForm
	} from '$lib/forms';
	import FormError from '$lib/forms/formError.svelte';
	import { m } from '$lib/i18n';
	import { pb } from '$lib/pocketbase/index.js';
	import { getCollectionSchema } from '$lib/pocketbase/schema/index.js';
	import {
		Collections,
		ServicesCryptographyOptions,
		TemplatesTypeOptions,
		type AuthorizationServersResponse,
		type IssuersResponse,
		type ServicesRecord,
		type ServicesResponse,
		type TemplatesResponse,
		type OrganizationsResponse
	} from '$lib/pocketbase/types.js';
	import { fieldsSchemaToZod } from '$lib/pocketbaseToZod/index.js';
	import { RecordForm } from '$lib/recordForm';
	import { createTypeProp } from '$lib/utils/typeProp.js';
	import { Button, P } from 'flowbite-svelte';
	import { Plus } from 'svelte-heros-v2';
	import TemplateForm from '../../templates/_partials/templateForm.svelte';
	import { createEventDispatcher } from 'svelte';
	import slugify from 'slugify';
	import FieldHelpText from '$lib/forms/fields/fieldParts/fieldHelpText.svelte';
	import ExpirationField from './expiration/expirationField.svelte';
	import { expirationSchema } from '$lib/issuanceFlows/expiration';
	import { TemplatePropertiesDisplay } from '$lib/templates';
	import { getRandomMicroservicePort } from '$lib/microservices';
	import { pipe, Array as A, Record as R } from 'effect';
	import { z } from 'zod';

	//

	export let organizationId: string;
	export let serviceId: string | undefined = undefined;
	export let initialData: Partial<ServicesRecord> = {};
	export let usedTypeNames: string[] = [];

	//

	const dispatch = createEventDispatcher<{ success: { record: ServicesResponse } }>();

	//

	const serviceSchema = fieldsSchemaToZod(getCollectionSchema(Collections.Services)!.schema).extend(
		{
			expiration: expirationSchema,
			type_name: z
				.string()
				.refine(
					(s) => !usedTypeNames.filter((s) => s != initialData.type_name).includes(s),
					m.Type_name_is_already_in_use()
				)
		}
	);

	const superform = createForm(
		serviceSchema,
		async (e) => {
			const formData = e.form.data;
			let record: ServicesResponse;
			if (serviceId) {
				record = await pb.collection('services').update(serviceId, formData);
			} else {
				record = await pb.collection('services').create(formData);
			}
			dispatch('success', { record });
		},
		{
			organization: organizationId,
			...cleanInitialData({
				cryptography: ServicesCryptographyOptions['sd-jwt'],
				api_available: true,
				public: false,
				...initialData
			})
		},
		{
			validationMethod: 'oninput'
		}
	);

	const { form } = superform;

	//

	// @ts-expect-error type_name is not a string
	$: slugifyText($form['type_name']);

	function slugifyText(text: string) {
		$form['type_name'] = slugify(text, {
			replacement: '_',
			strict: true,
			trim: false,
			lower: false
		}).trim();
	}

	//

	const issuerRecordProp = createTypeProp<IssuersResponse>();
	const authorizationServerTypeProp = createTypeProp<AuthorizationServersResponse>();

	//

	const submitButtonText = !Boolean(serviceId)
		? m.Create_issuance_flow()
		: m.Update_issuance_flow();

	// subset of ServicesCryptographyOptions
	const credentialTypeOptions: string[] = [ServicesCryptographyOptions['sd-jwt'], ServicesCryptographyOptions['W3C-VC']];

	const issuersType = createTypeProp<IssuersResponse>();
	const authorizationServersType = createTypeProp<AuthorizationServersResponse>();

	//

	let hideCredentialTemplateDrawer = createToggleStore(true);
	let hideAuthorizationTemplateDrawer = createToggleStore(true);
	let hideCredentialIssuerDrawer = createToggleStore(true);
	let hideAuthorizationServerDrawer = createToggleStore(true);

	//

	function templateFilter(type: TemplatesTypeOptions, organizationId: string) {
		return `type = '${type}' && ( organization.id = '${organizationId}' || public = true )`;
	}

	type Template = TemplatesResponse<unknown, { organization: OrganizationsResponse }>;

	const templateTypeProp = createTypeProp<Template>();

	async function formatTeplateRecordWithoutExpand(t: Template) {
		const isExternal = t.organization != organizationId;
		if (!isExternal) return formatTeplateRecord(t);
		const organization = await pb
			.collection('organizations')
			.getOne(t.organization, { requestKey: null })
		t.expand = { organization }
		return formatTeplateRecord(t)
	}
	function formatTeplateRecord(t: Template) {
		const isExternal = t.organization != organizationId;
		let label = [t.name];
		if (isExternal) label.push(`(@${(t.expand as any).organization.name})`);
		if (Boolean(t.description)) label.push(` | ${t.description}`);
		return label.join(' ');
	}

	// -- utils

	function cleanInitialData(record: Record<string, unknown>) {
		return pipe(
			Object.entries(record),
			R.fromEntries,
			R.map((value) => (Boolean(value) ? value : undefined))
		);
	}
</script>

<Form {superform} showRequiredIndicator className="space-y-10">
	<PageCard>
		<SectionTitle
			tag="h5"
			title={m.Basic_info()}
			description={m.issuance_flow_form_main_info_description()}
		/>

		<Input
			field="display_name"
			options={{ label: m.Display_name(), placeholder: m.Age_verification() }}
			{superform}
		/>

		<Input
			field="type_name"
			options={{
				label: m.Type_name(),
				helpText: m.Use_only_lowercase_and_uppercase_letters_no_spaces(),
				placeholder: m.service_type_name_placeholder()
			}}
			{superform}
		/>

		<Textarea
			field="description"
			options={{
				label: m.Description(),
				placeholder: m.issuance_flow_form_description_placeholder()
			}}
			{superform}
		/>

		<div class="flex items-start gap-8">
			<div class="grow">
				<Input
					field="logo"
					options={{
						placeholder: 'https://website.org/image.png',
						label: m.Credential_logo_URL(),
						type: 'url'
					}}
					{superform}
				/>
			</div>
			<div class="flex items-center gap-4">
				<P>{m.Preview()}</P>
				<ImagePreview src={$form.logo} alt={m.Credential_logo_URL()} />
			</div>
		</div>
	</PageCard>

	<PageCard>
		<SectionTitle
			tag="h5"
			title={m.Credential_info()}
			description={m.issuance_flow_form_credential_info_description()}
		/>

		<div class="space-y-2">
			<Select
				{superform}
				field="cryptography"
				options={{
					label: m.Cryptography(),
					options: credentialTypeOptions,
					disabled: false
				}}
			/>
			<FieldHelpText text={m.credential_type_help_text()} />
		</div>

		<div>
			<Relations
				recordType={templateTypeProp}
				collection={Collections.TemplatesPublicData}
				field="authorization_template"
				options={{
					label: m.Authorization_template(),
					inputMode: 'select',
					filter: templateFilter(TemplatesTypeOptions.authorization, organizationId),
					expand: 'organization',
					formatRecord: formatTeplateRecord
				}}
				{superform}
			>
				<svelte:fragment slot="labelRight">
					<Button outline size="xs" on:click={hideAuthorizationTemplateDrawer.off}>
						{m.New_authorization_template()}
						<Icon src={Plus} size={16} ml></Icon></Button
					>
				</svelte:fragment>
				<svelte:fragment slot="default" let:record>
					<div class="p-2">
						{#await formatTeplateRecordWithoutExpand(record) then label}
							<p>{label}</p>
						{/await}
						<TemplatePropertiesDisplay template={record}></TemplatePropertiesDisplay>
					</div>
				</svelte:fragment>
			</Relations>
		</div>

		<div>
			<Relations
				recordType={templateTypeProp}
				collection={Collections.TemplatesPublicData}
				field="credential_template"
				options={{
					label: m.Credential_template(),
					inputMode: 'select',
					filter: templateFilter(TemplatesTypeOptions.issuance, organizationId),
					expand: 'organization',
					formatRecord: formatTeplateRecord
				}}
				{superform}
			>
				<svelte:fragment slot="labelRight">
					<Button outline size="xs" on:click={hideCredentialTemplateDrawer.off}>
						{m.New_credential_template()}
						<Icon src={Plus} size={16} ml></Icon></Button
					>
				</svelte:fragment>
				<svelte:fragment slot="default" let:record>
					<div class="p-2">
						{#await formatTeplateRecordWithoutExpand(record) then label}
							<p>{label}</p>
						{/await}
						<TemplatePropertiesDisplay template={record}></TemplatePropertiesDisplay>
					</div>
				</svelte:fragment>
			</Relations>
		</div>

		<FieldWrapper field="expiration">
			<ExpirationField bind:expiration={$form['expiration']}></ExpirationField>
		</FieldWrapper>
	</PageCard>

	<PageCard>
		<SectionTitle
			tag="h5"
			title={m.Microservices()}
			description={m.issuance_flow_form_microservices_description()}
		/>

		<!-- Microservices should only be visible by admins and owners of the current organization -->
		<!-- This is to avoid that issuance flows are setup in a way that is impossible to deploy -->

		<div>
			<Relations
				recordType={authorizationServersType}
				collection={Collections.AuthorizationServers}
				field="authorization_server"
				options={{
					inputMode: 'select',
					displayFields: ['name', 'endpoint', 'port'],
					label: m.Authorization_server(),
					filter: `organization.id = "${organizationId}"`,
					formSettings: {
						defaults: {
							port: getRandomMicroservicePort()
						}
					}
				}}
				{superform}
			>
				<svelte:fragment slot="labelRight">
					<Button outline size="xs" on:click={hideAuthorizationServerDrawer.off}>
						{m.New_authorization_server()}
						<Icon src={Plus} size={16} ml></Icon>
					</Button>
				</svelte:fragment>
			</Relations>
		</div>

		<div>
			<Relations
				recordType={issuersType}
				collection={Collections.Issuers}
				field="credential_issuer"
				options={{
					inputMode: 'select',
					displayFields: ['name', 'endpoint', 'port'],
					label: m.Credential_issuer(),
					filter: `organization.id = "${organizationId}"`,
					formSettings: {
						defaults: {
							port: getRandomMicroservicePort()
						}
					}
				}}
				{superform}
			>
				<svelte:fragment slot="labelRight">
					<Button outline size="xs" on:click={hideCredentialIssuerDrawer.off}>
						{m.New_credential_issuer()}
						<Icon src={Plus} size={16} ml></Icon></Button
					>
				</svelte:fragment>
			</Relations>
		</div>
	</PageCard>

	<PageCard>
		<SectionTitle
			tag="h5"
			title={m.Advanced_settings()}
			description={m.advanced_settings_description()}
		/>
		<div class="space-y-4">
			<Checkbox field="public" {superform} options={{ disabled: true }}>
				{m.Is_public()}: {m.is_public_description()}
			</Checkbox>
			<Checkbox field="api_available" {superform} options={{ disabled: true }}>
				{m.Can_be_requested_via_API()}
			</Checkbox>
		</div>
	</PageCard>

	<PageCard>
		<FormError />

		<div class="flex justify-end">
			<SubmitButton>{submitButtonText}</SubmitButton>
		</div>
	</PageCard>
</Form>

<PortalWrapper>
	<Drawer
		closeOnClickOutside={false}
		width="w-[800px]"
		placement="right"
		bind:hidden={$hideCredentialTemplateDrawer}
		title={m.New_credential_template()}
	>
		<div class="p-8">
			<TemplateForm
				initialData={{
					organization: organizationId,
					type: TemplatesTypeOptions.issuance
				}}
				on:success={(e) => {
					$form['credential_template'] = e.detail.id;
					hideCredentialTemplateDrawer.on();
				}}
				on:cancel={hideCredentialTemplateDrawer.on}
			/>
		</div>
	</Drawer>
</PortalWrapper>

<PortalWrapper>
	<Drawer
		closeOnClickOutside={false}
		width="w-[800px]"
		placement="right"
		bind:hidden={$hideAuthorizationTemplateDrawer}
		title={m.New_authorization_template()}
	>
		<div class="p-8">
			<TemplateForm
				initialData={{
					organization: organizationId,
					type: TemplatesTypeOptions.authorization
				}}
				on:success={(e) => {
					$form['authorization_template'] = e.detail.id;
					hideAuthorizationTemplateDrawer.on();
				}}
				on:cancel={hideAuthorizationTemplateDrawer.on}
			/>
		</div>
	</Drawer>
</PortalWrapper>

<PortalWrapper>
	<Drawer
		closeOnClickOutside={false}
		width="w-[700px]"
		placement="right"
		bind:hidden={$hideCredentialIssuerDrawer}
		title={m.New_credential_issuer()}
	>
		<div class="p-8">
			<RecordForm
				recordType={issuerRecordProp}
				collection={Collections.Issuers}
				fieldsSettings={{
					hide: {
						organization: organizationId
					},
					defaults: {
						port: getRandomMicroservicePort()
					}
				}}
				on:success={(e) => {
					$form['credential_issuer'] = e.detail.record.id;
					hideCredentialIssuerDrawer.on();
				}}
				showCancelButton
				on:cancel={hideCredentialIssuerDrawer.on}
			/>
		</div>
	</Drawer>
</PortalWrapper>

<PortalWrapper>
	<Drawer
		closeOnClickOutside={false}
		width="w-[700px]"
		placement="right"
		bind:hidden={$hideAuthorizationServerDrawer}
		title={m.New_authorization_server()}
	>
		<div class="p-8">
			<RecordForm
				recordType={authorizationServerTypeProp}
				collection={Collections.AuthorizationServers}
				fieldsSettings={{
					hide: {
						organization: organizationId
					},
					defaults: {
						port: getRandomMicroservicePort()
					}
				}}
				on:success={(e) => {
					$form['authorization_server'] = e.detail.record.id;
					hideAuthorizationServerDrawer.on();
				}}
				showCancelButton
				on:cancel={hideAuthorizationServerDrawer.on}
			/>
		</div>
	</Drawer>
</PortalWrapper>
