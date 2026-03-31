require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= PANEL =================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!panel') {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('create').setLabel('Create Project').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('add_dev').setLabel('Add Dev').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('add_design').setLabel('Add Design').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('archive').setLabel('Archive').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({
      content: '📊 Project Panel',
      components: [row]
    });
  }
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async (interaction) => {
  try {
    const guild = interaction.guild;

    // ================= PERMISSION CHECK =================
    const allowedRoles = ['CEO', 'SALES', 'Project Management', 'admin'];
    const member = interaction.member;
    const hasPermission = member.roles.cache.some(role => allowedRoles.includes(role.name));

    if (!hasPermission) {
      const responseContent = '❌ You do not have permission to use this bot. Only members with CEO, SALES, Project Management, or admin roles can use it.';
      
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        return interaction.reply({ content: responseContent, flags: 64 });
      } else if (interaction.isModalSubmit()) {
        return interaction.reply({ content: responseContent, flags: 64 });
      }
      return;
    }

    // ================= BUTTONS =================
    if (interaction.isButton()) {

      const modal = new ModalBuilder()
        .setTitle('Project Name')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('name')
              .setLabel('Enter Project Name')
              .setStyle(TextInputStyle.Short)
          )
        );

      if (interaction.customId === 'create') {
        modal.setCustomId('create_modal');
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'archive') {
        modal.setCustomId('archive_modal');
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'delete') {
        const select = new StringSelectMenuBuilder()
          .setCustomId('delete_type_select')
          .setPlaceholder('Choose what to delete')
          .addOptions(
            { label: 'Delete Project', value: 'project', emoji: '🗑️' },
            { label: 'Remove Role from Member', value: 'role', emoji: '👤' }
          );

        return interaction.reply({
          content: 'Select what you want to delete:',
          components: [new ActionRowBuilder().addComponents(select)],
          flags: 64
        });
      }

      // ADD DEV / DESIGN → PROJECT SELECT
      if (interaction.customId === 'add_dev' || interaction.customId === 'add_design') {

        const projects = guild.channels.cache
          .filter(c => c.type === ChannelType.GuildCategory && c.name.startsWith('📁'))
          .map(c => ({
            label: c.name.replace('📁 ', ''),
            value: c.name.replace('📁 ', '')
          }))
          .slice(0, 25);

        if (!projects.length)
          return interaction.reply({ content: 'No projects found', flags: 64 });

        const select = new StringSelectMenuBuilder()
          .setCustomId(`${interaction.customId}_project`)
          .setPlaceholder('Select Project')
          .addOptions(projects);

        return interaction.reply({
          content: 'Select project',
          components: [new ActionRowBuilder().addComponents(select)],
          flags: 64
        });
      }
    }

    // ================= MODALS =================
    if (interaction.isModalSubmit()) {

      const projectName = interaction.fields.getTextInputValue('name');

      // CREATE PROJECT → SELECT DEV
      if (interaction.customId === 'create_modal') {

        await guild.members.fetch();

        const users = guild.members.cache
          .filter(m => !m.user.bot)
          .map(m => ({ label: m.user.username, value: m.id }))
          .slice(0, 25);

        const select = new StringSelectMenuBuilder()
          .setCustomId(`create_dev_${projectName}`)
          .setPlaceholder('Select Developers')
          .setMinValues(1)
          .setMaxValues(users.length)
          .addOptions(users);

        return interaction.reply({
          content: 'Select developers',
          components: [new ActionRowBuilder().addComponents(select)],
          flags: 64
        });
      }

      // ARCHIVE
      if (interaction.customId === 'archive_modal') {

        const category = guild.channels.cache.find(c => c.name === `📁 ${projectName}`);
        if (!category)
          return interaction.reply({ content: 'Project not found', flags: 64 });

        // Defer immediately before any long operations
        await interaction.deferReply({ flags: 64 });

        const devRole = guild.roles.cache.find(r => r.name === `DEV-${projectName}`);
        const designRole = guild.roles.cache.find(r => r.name === `DESIGN-${projectName}`);

        // Remove roles from all users
        for (const member of guild.members.cache.values()) {
          if (devRole && member.roles.cache.has(devRole.id))
            await member.roles.remove(devRole).catch(() => {});
          if (designRole && member.roles.cache.has(designRole.id))
            await member.roles.remove(designRole).catch(() => {});
        }

        // Rename category to archive format
        await category.setName(`archive-${projectName}`).catch(() => {});

        return interaction.editReply({ content: '✅ Project archived' });
      }

      // DELETE (legacy - kept for backwards compatibility)
      if (interaction.customId === 'delete_modal') {

        const projectName = interaction.fields.getTextInputValue('name');
        const category = guild.channels.cache.find(c => c.name === `📁 ${projectName}`);
        if (!category)
          return interaction.reply({ content: 'Project not found', flags: 64 });

        // Defer immediately before any long operations
        await interaction.deferReply({ flags: 64 });

        const devRole = guild.roles.cache.find(r => r.name === `DEV-${projectName}`);
        const designRole = guild.roles.cache.find(r => r.name === `DESIGN-${projectName}`);

        // remove roles from users
        for (const member of guild.members.cache.values()) {
          if (devRole && member.roles.cache.has(devRole.id))
            await member.roles.remove(devRole).catch(() => {});
          if (designRole && member.roles.cache.has(designRole.id))
            await member.roles.remove(designRole).catch(() => {});
        }

        const channels = guild.channels.cache.filter(c => c.parentId === category.id);
        for (let ch of channels.values()) {
          await ch.delete().catch(() => {});
        }

        await category.delete().catch(() => {});
        if (devRole) await devRole.delete().catch(() => {});
        if (designRole) await designRole.delete().catch(() => {});

        await interaction.editReply({
          content: '🗑️ Project deleted successfully'
        });
      }
    }

    // ================= DROPDOWNS =================
    if (interaction.isStringSelectMenu()) {

      // DELETE TYPE SELECT
      if (interaction.customId === 'delete_type_select') {
        const deleteType = interaction.values[0];

        if (deleteType === 'project') {
          const projects = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory && (c.name.startsWith('📁') || c.name.startsWith('archive-')))
            .map(c => {
              const projectName = c.name.replace('📁 ', '').replace('archive-', '');
              const isArchived = c.name.startsWith('archive-');
              return { 
                label: isArchived ? `${projectName} (archived)` : projectName, 
                value: c.name 
              };
            })
            .slice(0, 25);

          if (!projects.length)
            return interaction.reply({ content: 'No projects found', flags: 64 });

          const select = new StringSelectMenuBuilder()
            .setCustomId('delete_project_select')
            .setPlaceholder('Select Project to Delete')
            .addOptions(projects);

          return interaction.reply({
            content: 'Select project to delete:',
            components: [new ActionRowBuilder().addComponents(select)],
            flags: 64
          });
        }

        if (deleteType === 'role') {
          // Show projects with roles
          const projects = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory && (c.name.startsWith('📁') || c.name.startsWith('archive-')))
            .map(c => {
              const projectName = c.name.replace('📁 ', '').replace('archive-', '');
              return { label: projectName, value: projectName };
            })
            .slice(0, 25);

          if (!projects.length)
            return interaction.reply({ content: 'No projects found', flags: 64 });

          const select = new StringSelectMenuBuilder()
            .setCustomId('remove_role_project')
            .setPlaceholder('Select Project')
            .addOptions(projects);

          return interaction.reply({
            content: 'Select project to remove role from member:',
            components: [new ActionRowBuilder().addComponents(select)],
            flags: 64
          });
        }
      }

      // DELETE PROJECT SELECT
      if (interaction.customId === 'delete_project_select') {
        const categoryName = interaction.values[0];
        const category = guild.channels.cache.find(c => c.name === categoryName);

        if (!category)
          return interaction.reply({ content: 'Project not found', flags: 64 });

        await interaction.deferUpdate();

        // Extract project name (remove emoji and archive prefix)
        const projectName = categoryName.replace('📁 ', '').replace('archive-', '');
        const devRole = guild.roles.cache.find(r => r.name === `DEV-${projectName}`);
        const designRole = guild.roles.cache.find(r => r.name === `DESIGN-${projectName}`);

        // Remove roles from all users
        for (const member of guild.members.cache.values()) {
          if (devRole && member.roles.cache.has(devRole.id))
            await member.roles.remove(devRole).catch(() => {});
          if (designRole && member.roles.cache.has(designRole.id))
            await member.roles.remove(designRole).catch(() => {});
        }

        // Delete all channels in the category
        const channels = guild.channels.cache.filter(c => c.parentId === category.id);
        for (let ch of channels.values()) {
          await ch.delete().catch(() => {});
        }

        // Delete category and roles
        await category.delete().catch(() => {});
        if (devRole) await devRole.delete().catch(() => {});
        if (designRole) await designRole.delete().catch(() => {});

        return interaction.editReply({
          content: `🗑️ Project "${projectName}" deleted successfully`,
          components: []
        });
      }

      // REMOVE ROLE - PROJECT SELECT
      if (interaction.customId === 'remove_role_project') {
        const projectName = interaction.values[0];

        await interaction.deferUpdate();

        // Get users with either role
        const devRole = guild.roles.cache.find(r => r.name === `DEV-${projectName}`);
        const designRole = guild.roles.cache.find(r => r.name === `DESIGN-${projectName}`);

        const membersWithRoles = guild.members.cache.filter(m => 
          (devRole && m.roles.cache.has(devRole.id)) || (designRole && m.roles.cache.has(designRole.id))
        );

        if (!membersWithRoles.size)
          return interaction.editReply({ content: 'No members with roles in this project', components: [] });

        const options = membersWithRoles.map(m => ({
          label: m.user.username,
          value: m.id
        })).slice(0, 25);

        const select = new StringSelectMenuBuilder()
          .setCustomId(`remove_role_member_${projectName}`)
          .setPlaceholder('Select Member')
          .addOptions(options);

        return interaction.editReply({
          content: 'Select member to remove role from:',
          components: [new ActionRowBuilder().addComponents(select)]
        });
      }

      // REMOVE ROLE - MEMBER SELECT
      if (interaction.customId.startsWith('remove_role_member_')) {
        const projectName = interaction.customId.replace('remove_role_member_', '');
        const memberId = interaction.values[0];

        await interaction.deferUpdate();

        const devRole = guild.roles.cache.find(r => r.name === `DEV-${projectName}`);
        const designRole = guild.roles.cache.find(r => r.name === `DESIGN-${projectName}`);

        const member = await guild.members.fetch(memberId);
        const hasDevRole = devRole && member.roles.cache.has(devRole.id);
        const hasDesignRole = designRole && member.roles.cache.has(designRole.id);

        let removedRoles = [];
        if (hasDevRole) {
          await member.roles.remove(devRole);
          removedRoles.push('DEV');
        }
        if (hasDesignRole) {
          await member.roles.remove(designRole);
          removedRoles.push('DESIGN');
        }

        return interaction.editReply({
          content: `✅ Removed ${removedRoles.join(' and ')} role(s) from <@${memberId}>`,
          components: []
        });
      }

      // ADD DEV/DESIGN → USER SELECT
      if (interaction.customId === 'add_dev_project' || interaction.customId === 'add_design_project') {

        const projectName = interaction.values[0];
        const roleType = interaction.customId === 'add_dev_project' ? 'DEV' : 'DESIGN';

        await interaction.deferUpdate();

        const users = guild.members.cache
          .filter(m => !m.user.bot)
          .map(m => ({ label: m.user.username, value: m.id }))
          .slice(0, 25);

        if (!users.length)
          return interaction.editReply({ content: 'No users available', components: [] });

        const select = new StringSelectMenuBuilder()
          .setCustomId(`${roleType.toLowerCase()}_add_users_${projectName}`)
          .setPlaceholder(`Select ${roleType}s to add`)
          .setMinValues(1)
          .setMaxValues(users.length)
          .addOptions(users);

        return interaction.editReply({
          content: `Select ${roleType}s for ${projectName}`,
          components: [new ActionRowBuilder().addComponents(select)]
        });
      }

      // ADD DEV/DESIGN → ASSIGN ROLE
      if (interaction.customId.startsWith('dev_add_users_') || interaction.customId.startsWith('design_add_users_')) {

        const parts = interaction.customId.split('_');
        const roleType = parts[0].toUpperCase();
        const projectName = parts.slice(3).join('_');
        const userIds = interaction.values;

        await interaction.deferUpdate();

        const role = guild.roles.cache.find(r => r.name === `${roleType}-${projectName}`);
        if (!role)
          return interaction.editReply({ content: 'Role not found', components: [] });

        for (let id of userIds) {
          const member = await guild.members.fetch(id).catch(() => null);
          if (member)
            await member.roles.add(role).catch(() => {});
        }

        return interaction.editReply({
          content: `✅ Added ${userIds.length} ${roleType}(s) to ${projectName}`,
          components: []
        });
      }

      // CREATE → DEV SELECT
      if (interaction.customId.startsWith('create_dev_')) {

        const projectName = interaction.customId.replace('create_dev_', '');
        const devUsers = interaction.values;

        await interaction.deferUpdate();

        const users = guild.members.cache
          .filter(m => !m.user.bot)
          .map(m => ({ label: m.user.username, value: m.id }))
          .slice(0, 25);

        const select = new StringSelectMenuBuilder()
          .setCustomId(`create_design_${projectName}_${devUsers.join(',')}`)
          .setPlaceholder('Select Designers')
          .setMinValues(1)
          .setMaxValues(users.length)
          .addOptions(users);

        return interaction.editReply({
          content: 'Select designers',
          components: [new ActionRowBuilder().addComponents(select)]
        });
      }

      // FINAL CREATE
      if (interaction.customId.startsWith('create_design_')) {

        const parts = interaction.customId.split('_');
        const projectName = parts[2];
        const devUsers = parts[3].split(',');
        const designUsers = interaction.values;

        await interaction.deferUpdate();

        const devRole = await guild.roles.create({ 
          name: `DEV-${projectName}`,
          color: 3447693, // Blue
          reason: `Created for project ${projectName}`
        });
        const designRole = await guild.roles.create({ 
          name: `DESIGN-${projectName}`,
          color: 15548997, // Pink
          reason: `Created for project ${projectName}`
        });

        // Make roles only visible to admins, ceo, sales, project management roles
        const allowedRoles = ['admin', 'ceo', 'sales', 'project management', 'projectmanager bot'];
        const guild_roles = guild.roles.cache;

        for (const role of [devRole, designRole]) {
          try {
            // Set role to hidden (hoist=false, mentionable=false unless you're the allowed roles)
            await role.edit({ hoist: false, mentionable: false });
          } catch (e) {}
        }

        for (let id of devUsers) {
          const m = await guild.members.fetch(id);
          await m.roles.add(devRole);
        }

        for (let id of designUsers) {
          const m = await guild.members.fetch(id);
          await m.roles.add(designRole);
        }

        const category = await guild.channels.create({
          name: `📁 ${projectName}`,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: devRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            { id: designRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });

        const create = (n, t) => guild.channels.create({ name: n, type: t, parent: category.id });

        await create('overview', ChannelType.GuildText);
        await create('dev-discussion', ChannelType.GuildText);
        await create('design-discussion', ChannelType.GuildText);
        await create('assets', ChannelType.GuildText);
        await create('meeting', ChannelType.GuildVoice);

        return interaction.editReply({
          content: `✅ Project "${projectName}" created`,
          components: []
        });
      }
    }

  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.TOKEN);