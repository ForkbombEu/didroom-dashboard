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
		Form,
		Input,
		Relations,
		SubmitButton,
		Textarea,
		createForm,
		createFormData
	} from '$lib/forms';
	import FormError from '$lib/forms/formError.svelte';
	import { goto, m } from '$lib/i18n';
	import { pb } from '$lib/pocketbase/index.js';
	import { getCollectionSchema } from '$lib/pocketbase/schema/index.js';
	import {
		Collections,
		TemplatesTypeOptions,
		type VerificationFlowsRecord,
		type VerificationFlowsResponse,
		type RelyingPartiesResponse,
		type OrganizationsResponse,
		type TemplatesResponse
	} from '$lib/pocketbase/types.js';
	import { fieldsSchemaToZod } from '$lib/pocketbaseToZod/index.js';
	import { RecordForm } from '$lib/recordForm';
	import { createTypeProp } from '$lib/utils/typeProp.js';
	import { Button, P } from 'flowbite-svelte';
	import { Plus } from 'svelte-heros-v2';
	import TemplateForm from '../../templates/_partials/templateForm.svelte';
	import { createEventDispatcher } from 'svelte';
	import { getRandomMicroservicePort } from '$lib/microservices';

	//

	export let organizationId: string;
	export let verificationFlowId: string | undefined = undefined;
	export let initialData: Partial<VerificationFlowsRecord> = {};

	//

	const dispatch = createEventDispatcher<{ success: { record: VerificationFlowsResponse } }>();

	//

	const verificationFlowSchema = fieldsSchemaToZod(
		getCollectionSchema(Collections.VerificationFlows)!.schema
	);

	const superform = createForm(
		verificationFlowSchema,
		async (e) => {
			const formData = createFormData(e.form.data);
			let record: VerificationFlowsResponse;
			if (verificationFlowId) {
				record = await pb
					.collection(Collections.VerificationFlows)
					.update(verificationFlowId, formData);
			} else {
				record = await pb
					.collection(Collections.VerificationFlows)
					.create<VerificationFlowsResponse>(formData);
			}
			dispatch('success', { record });
		},
		{
			organization: organizationId,
			public: false,
			...initialData
		}
	);

	const { form } = superform;

	//

	const submitButtonText = !Boolean(verificationFlowId)
		? m.Create_verification_flow()
		: m.Update_verification_flow();

	//

	let hideVerificationTemplateDrawer = createToggleStore(true);
	let hideRelyingPartyDrawer = createToggleStore(true);

	//

	const relyingPartyTypeProp = createTypeProp<RelyingPartiesResponse>();

	//

	function templateFilter(type: TemplatesTypeOptions, organizationId: string) {
		return `type = '${type}' && ( organization.id = '${organizationId}' || public = true )`;
	}

	type Template = TemplatesResponse<unknown, { organization: OrganizationsResponse }>;

	const templateTypeProp = createTypeProp<Template>();

	function formatTeplateRecord(t: Template) {
		const isExternal = t.organization != organizationId;
		const organizationName = isExternal ? ` (@${t.expand?.organization.name})` : '';
		return `${t.name} ${organizationName} | ${t.description}`;
	}
</script>

<Form {superform} showRequiredIndicator className="space-y-10">
	<PageCard>
		<SectionTitle
			tag="h5"
			title={m.Basic_info()}
			description={m.verification_flow_form_basic_info_description()}
		/>

		<Input
			field="name"
			options={{ label: m.Name(), placeholder: m.verification_flow_form_name_placeholder() }}
			{superform}
		/>

		<Textarea
			field="description"
			options={{
				label: m.Description(),
				placeholder: m.verification_flow_form_description_placeholder()
			}}
			{superform}
		/>

		<!-- <div class="flex items-start gap-8">
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
		</div> -->
	</PageCard>

	<PageCard>
		<SectionTitle
			tag="h5"
			title={m.Verification_info()}
			description={m.verification_info_description()}
		/>

		<div>
			<Relations
				recordType={templateTypeProp}
				collection={Collections.TemplatesPublicData}
				field="template"
				options={{
					label: m.Verification_template(),
					inputMode: 'select',
					filter: templateFilter(TemplatesTypeOptions.verification, organizationId),
					formatRecord: formatTeplateRecord,
					expand: 'organization'
				}}
				{superform}
			>
				<svelte:fragment slot="labelRight">
					<Button outline size="xs" on:click={hideVerificationTemplateDrawer.off}>
						{m.New_verification_template()}
						<Icon src={Plus} size={16} ml />
					</Button>
				</svelte:fragment>
			</Relations>
		</div>
	</PageCard>

	<PageCard>
		<SectionTitle
			tag="h5"
			title={m.Microservices()}
			description={m.verification_flow_form_microservices_description()}
		/>

		<div>
			<!-- Microservices should only be visible by admins and owners of the current organization -->
			<!-- This is to avoid that issuance flows are setup in a way that is impossible to deploy -->
			<Relations
				recordType={relyingPartyTypeProp}
				collection={Collections.RelyingParties}
				field="relying_party"
				options={{
					inputMode: 'select',
					displayFields: ['name', 'endpoint', 'port'],
					label: m.Verifier(),
					filter: `organization.id = '${organizationId}'`
				}}
				{superform}
			>
				<svelte:fragment slot="labelRight">
					<Button outline size="xs" on:click={hideRelyingPartyDrawer.off}>
						{m.New_relying_party()}
						<Icon src={Plus} size={16} ml></Icon>
					</Button>
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
		<Checkbox field="public" {superform} options={{ disabled: true }}>
			{m.Is_public()}: {m.is_public_description()}
		</Checkbox>
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
		width="w-[700px]"
		placement="right"
		bind:hidden={$hideVerificationTemplateDrawer}
		title={m.New_verification_template()}
	>
		<div class="p-8">
			<TemplateForm
				initialData={{
					organization: organizationId,
					type: TemplatesTypeOptions.verification
				}}
				on:success={(e) => {
					$form['template'] = e.detail.id;
					hideVerificationTemplateDrawer.on();
				}}
				on:cancel={hideVerificationTemplateDrawer.on}
			/>
		</div>
	</Drawer>
</PortalWrapper>

<PortalWrapper>
	<Drawer
		width="w-[700px]"
		placement="right"
		bind:hidden={$hideRelyingPartyDrawer}
		title={m.New_relying_party()}
	>
		<div class="p-8">
			<RecordForm
				recordType={relyingPartyTypeProp}
				collection={Collections.RelyingParties}
				fieldsSettings={{
					hide: {
						organization: organizationId
					},
					defaults: {
						port: getRandomMicroservicePort()
					}
				}}
				on:success={(e) => {
					$form['relying_party'] = e.detail.record.id;
					hideRelyingPartyDrawer.on();
				}}
				showCancelButton
				on:cancel={hideRelyingPartyDrawer.on}
			/>
		</div>
	</Drawer>
</PortalWrapper>
