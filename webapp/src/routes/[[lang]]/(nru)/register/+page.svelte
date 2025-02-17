<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto, m } from '$lib/i18n';
	import { z } from 'zod';

	import { A, Alert, Heading, Hr, P } from 'flowbite-svelte';
	import { Form, createForm, Input, Checkbox, FormError, SubmitButton } from '$lib/forms';
	import { featureFlags } from '$lib/features';
	import { OrganizationInviteSession } from '$lib/organizations/invites';
	import { appTitle } from '$lib/strings';
	import { WelcomeSession } from '$lib/utils/welcome';
	import WelcomeBanner from '$lib/components/welcomeBanner.svelte';

	//

	const schema = z
		.object({
			name: z.string(),
			email: z.string().email(),
			password: z.string().min(8),
			passwordConfirm: z.string().min(8),
			acceptTerms: z.boolean()
		})
		.refine((data) => data.password === data.passwordConfirm, m.PASSWORDS_DO_NOT_MATCH());

	const superform = createForm(schema, async ({ form }) => {
		const { data } = form;
		const u = pb.collection('users');
		await u.create(data);
		await u.authWithPassword(data.email, data.password);
		await u.requestVerification(data.email);
		WelcomeSession.start();
		await goto('/my');
	});

	const { form } = superform;

	if ($featureFlags.ORGANIZATIONS) {
		const inviteSession = OrganizationInviteSession.getData();
		if (inviteSession) $form.email = inviteSession.email;
	}

	function getOrganization(id: string) {
		return pb.collection('organizations').getOne(id, { requestKey: null });
	}

	$: disableEmail = $featureFlags.ORGANIZATIONS && OrganizationInviteSession.isActive();
</script>

{#if $featureFlags.ORGANIZATIONS}
	{@const inviteSession = OrganizationInviteSession.getData()}
	{#if inviteSession}
		{#await getOrganization(inviteSession.organizationId) then organization}
			<WelcomeBanner class="mb-6">
				<div>
					<P color="yellow">
						{@html m.you_have_been_invited_by_organization_to_join_the_platform({
							organizationName: organization.name
						})}
					</P>
					<P color="yellow">{m.Please_register_using_the_provided_email_account_()}</P>
				</div>
			</WelcomeBanner>
		{/await}
	{/if}
{/if}

<Heading tag="h4">Create an account</Heading>

<Form {superform}>
	<Input
		{superform}
		field="email"
		options={{
			type: 'email',
			label: m.Your_email(),
			placeholder: m.namefoundation_org(),
			disabled: disableEmail
		}}
	/>

	<Input
		{superform}
		field="name"
		options={{
			type: 'text',
			label: m.Full_name(),
			placeholder: m.John_Doe(),
			helpText: m.Organizations_and_other_users_will_identify_you_by_your_name_()
		}}
	/>

	<Input
		{superform}
		field="password"
		options={{
			type: 'password',
			label: m.Your_password(),
			placeholder: '•••••'
		}}
	/>

	<Input
		{superform}
		field="passwordConfirm"
		options={{
			type: 'password',
			label: m.Confirm_password(),
			placeholder: '•••••'
		}}
	/>

	<Checkbox {superform} field="acceptTerms">
		{m.I_accept_the()}
		<A
			href="https://didroom.com/guides/Terms-and-conditions/privacy-policy.html"
			target="_blank"
		>
			{m.Terms_and_Conditions()}
		</A>
		{m.and()}
		<A href="https://didroom.com/guides/Terms-and-conditions" target="_blank">
			{m.privacy_policy()}
		</A>
	</Checkbox>

	<FormError />

	<div class="flex justify-end">
		<SubmitButton>{m.Create_an_account()}</SubmitButton>
	</div>
</Form>

<div class="flex flex-col gap-4">
	<Hr hrClass="!m-0" />
	<P class="text-center" color="text-gray-500 dark:text-gray-400" size="sm">
		{m.Already_have_an_account()}
		<A href="/login">{m.Login_here()}</A>
	</P>
</div>
