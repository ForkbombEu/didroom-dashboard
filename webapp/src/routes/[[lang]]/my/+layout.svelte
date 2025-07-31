<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { currentUser } from '$lib/pocketbase';

	import {
		UIShell,
		Sidebar,
		Logo,
		SidebarLinks,
		MainContent,
		SidebarCloseButton,
		Topbar,
		HamburgerButton
	} from '$lib/layout';
	import {
		Dropdown,
		DropdownDivider,
		DropdownHeader,
		DropdownItem,
		Hr,
		SidebarGroup
	} from 'flowbite-svelte';
	import {
		ArrowLeftOnRectangle,
		CheckCircle,
		Fire,
		Home,
		InboxArrowDown,
		QuestionMarkCircle,
		RectangleStack,
		User,
		EllipsisHorizontal,
		Document,
		Users,
		LockClosed
	} from 'svelte-heros-v2';
	import { createOrganizationSidebarLinks, getUserRole } from '$lib/organizations';
	import { m } from '$lib/i18n';
	import UserAvatar from '$lib/components/userAvatar.svelte';
	import { getUserDisplayName } from '$lib/utils/pb';
	import Icon from '$lib/components/icon.svelte';
	import { goto } from '$lib/i18n';
	import LanguageSwitcher from '$lib/i18n/languageSwitcher.svelte';
	import SidebarButton from '$lib/layout/SidebarButton.svelte';
	import { appTitle } from '$lib/strings';
	import { version } from '$app/environment';
	import { featureFlags } from '$lib/features';
	import { getUserDidUrl } from '$lib/did/index.js';

	import { pb } from '$lib/pocketbase';
	import type {
		OrgAuthorizationsResponse,
		OrgRolesResponse,
		OrganizationsResponse
	} from '$lib/pocketbase/types';

	//

	let sidebarLayoutBreakpoint = 1024;

	//

	function getOrgAuthorizations() {
		type Authorizations = Required<
			OrgAuthorizationsResponse<{
				organization: OrganizationsResponse;
				role: OrgRolesResponse;
			}>
		>;

		return pb.collection('orgAuthorizations').getFullList<Authorizations>({
			filter: `user = "${pb.authStore.model!.id}"`,
			expand: 'organization,role',
			fetch,
			requestKey: null
		});
	}
</script>

<UIShell {sidebarLayoutBreakpoint} let:toggleSidebar>
	<svelte:fragment slot="top" let:sidebarLayoutMode>
		{#if sidebarLayoutMode == 'drawer'}
			<Topbar>
				<svelte:fragment slot="left">
					<div class="flex space-x-2">
						<Logo />
					</div>
				</svelte:fragment>
				<svelte:fragment slot="center">
					<div class="flex items-center">
						{#if $currentUser}
							<span class="whitespace-nowrap">
								{m.hello()},
								<span class="text-primary-600 font-semibold">
									{getUserDisplayName($currentUser)}
								</span>
							</span>
						{/if}
					</div>
				</svelte:fragment>
				<svelte:fragment slot="right">
					<HamburgerButton />
				</svelte:fragment>
			</Topbar>
		{/if}
	</svelte:fragment>

	<Sidebar darkMode>
		<svelte:fragment slot="top">
			<div class="flex items-center justify-between border-b border-gray-600 px-3 py-2.5">
				<Logo />
				<SidebarCloseButton />
			</div>
		</svelte:fragment>

		<div class="space-y-0">
			<SidebarGroup>
				<div class="p-3">
					<SidebarLinks
						links={[
							{
								text: m.Home(),
								href: '/my',
								icon: Home
							},
							{
								text: m.notifications(),
								icon: InboxArrowDown,
								href: '/my/notifications',
								disabled: true
							}
						]}
					/>
				</div>
			</SidebarGroup>

			<Hr />

			<p class="p-4 text-xs font-medium uppercase tracking-wide text-gray-500">
				{m.signatures()}
			</p>

			<SidebarGroup>
				<div class="p-3 pt-0">
					<SidebarLinks
						links={[
							{
								text: m.my_signatures(),
								href: '/my/signatures',
								icon: RectangleStack
							},
							{
								text: m.multisignatures(),
								href: '/my/multisignatures',
								icon: Users
							},
							{
								text: m.validate_signatures(),
								href: '/my/validate',
								icon: CheckCircle
							},
							{
								text: m.Certificates(),
								href: '/my/certificates',
								icon: LockClosed
							}
						]}
					/>
				</div>
			</SidebarGroup>

			<Hr />

			<p class="p-4 text-xs font-medium uppercase tracking-wide text-gray-500">
				{m.organizations()}
			</p>

			<SidebarGroup>
				<div class="space-y-2 p-3 pt-0">
					<SidebarLinks
						links={[
							{
								text: m.My_organizations(),
								href: '/my/organizations',
								icon: RectangleStack
							}
						]}
					/>

					{#if $featureFlags.ORGANIZATIONS}
						{#await getOrgAuthorizations() then authorizations}
							{#each authorizations as authorization}
								{@const organization = authorization.expand.organization}
								{@const organizationId = organization.id}
								{@const userId = $currentUser?.id ?? ''}
								{#await getUserRole(organizationId, userId) then userRole}
									{@const links = createOrganizationSidebarLinks(organization, m, userRole)}
									<SidebarLinks {links} />
								{/await}
							{/each}
						{/await}
					{/if}
				</div>
			</SidebarGroup>
		</div>

		<svelte:fragment slot="bottom">
			<SidebarGroup class="space-y-1">
				<SidebarLinks
					links={[
						{
							text: 'Help',
							icon: QuestionMarkCircle,
							href: 'https://didroom.com/get_started.html'
						}
					]}
				/>

				<LanguageSwitcher />

				{#if $currentUser}
					{@const id = 'menu-trigger'}
					{@const idSelector = `#${id}`}
					<SidebarButton {id} class="py-1 pl-1">
						<div class="flex items-center gap-2">
							<div class="">
								<UserAvatar size="sm" />
							</div>
							<span>{getUserDisplayName($currentUser)}</span>
						</div>
						<Icon src={EllipsisHorizontal} slot="right" />
					</SidebarButton>

					<Dropdown triggeredBy={idSelector} class="w-[215px]">
						<DropdownHeader>
							<span class="block truncate text-xs font-medium text-gray-500">
								{getUserDisplayName($currentUser)}
							</span>
						</DropdownHeader>
						<DropdownItem href="/my/profile" class="flex" on:click={toggleSidebar}>
							<Icon src={User} mr />
							{m.My_profile()}
						</DropdownItem>

						<DropdownDivider />

						{#if $featureFlags.DID}
							{#await getUserDidUrl() then url}
								<DropdownItem href={url} class="flex" target="_blank">
									<Icon src={Document} mr />
									{m.my_DID()}
								</DropdownItem>
							{/await}
						{/if}

						<DropdownDivider />

						<DropdownItem href="/pricing" class="flex" on:click={toggleSidebar}>
							<Icon src={Fire} mr class="text-red-700 dark:text-red-400" />
							{m.Go_Pro()}
						</DropdownItem>

						<DropdownDivider />

						<DropdownItem
							on:click={() => goto('/logout')}
							class="flex text-red-700 dark:text-red-400"
						>
							<Icon src={ArrowLeftOnRectangle} mr />
							{m.Sign_out()}
						</DropdownItem>
					</Dropdown>
				{/if}
			</SidebarGroup>
			<div class="mt-2 flex border-t border-t-white/20 pt-1">
				<p class="px-2 font-mono text-xs text-white opacity-30">{appTitle} – Version {version}</p>
			</div>
		</svelte:fragment>
	</Sidebar>

	<MainContent>
		<div class="min-h-screen overflow-auto bg-[url('/bg.png')] bg-cover">
			<slot />
		</div>
	</MainContent>
</UIShell>
