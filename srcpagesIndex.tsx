import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { CommandCard } from "@/components/CommandCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface Command {
  name: string;
  description: string;
  usage: string;
  category: string;
  examples?: string[];
  permissions?: string[];
}

const commands: Command[] = [
  // Spy / Info Commands
  {
    name: "info",
    description: "Shows detailed info about a user",
    usage: ",info @user or user_id",
    category: "Spy / Info",
    examples: [",info @user123", ",info 123456789"],
    permissions: []
  },
  {
    name: "bscan",
    description: "Scan server for bot accounts",
    usage: ",bscan / ,bs",
    category: "Spy / Info",
    examples: [",bscan", ",bs"],
    permissions: []
  },
  {
    name: "infect",
    description: "Infect a user (nickname & bio)",
    usage: ",infect @user / ,i @user",
    category: "Spy / Info",
    examples: [",infect @user123", ",i @user123"],
    permissions: []
  },
  {
    name: "infectall",
    description: "Infect all users",
    usage: ",infectall / ,ia",
    category: "Spy / Info",
    examples: [",infectall", ",ia"],
    permissions: []
  },
  {
    name: "disinfect",
    description: "Disinfect a user",
    usage: ",disinfect @user / ,di @user",
    category: "Spy / Info",
    examples: [",disinfect @user123", ",di @user123"],
    permissions: []
  },
  {
    name: "disinfectall",
    description: "Disinfect all users",
    usage: ",disinfectall / ,dia",
    category: "Spy / Info",
    examples: [",disinfectall", ",dia"],
    permissions: []
  },
  {
    name: "limitmsgs",
    description: "Limit messages for a user",
    usage: ",limitmsgs @user <amount> / ,lm @user <amount>",
    category: "Spy / Info",
    examples: [",limitmsgs @user123 10", ",lm @user123 5"],
    permissions: []
  },
  {
    name: "resetlimitmsgs",
    description: "Remove message limit from a user",
    usage: ",resetlimitmsgs @user / ,rlm @user",
    category: "Spy / Info",
    examples: [",resetlimitmsgs @user123", ",rlm @user123"],
    permissions: []
  },
  {
    name: "whitelist",
    description: "Allow user to use commands",
    usage: ",whitelist @user / ,wl @user",
    category: "Spy / Info",
    examples: [",whitelist @user123", ",wl @user123"],
    permissions: []
  },
  {
    name: "unwhitelist",
    description: "Remove whitelist from user",
    usage: ",unwhitelist @user / ,unwl @user",
    category: "Spy / Info",
    examples: [",unwhitelist @user123", ",unwl @user123"],
    permissions: []
  },
  // Moderation Commands
  {
    name: "mute",
    description: "Mute a user for specified duration",
    usage: ",mute @user <duration>",
    category: "Moderation",
    examples: [",mute @user123 10m", ",mute @user123 1h"],
    permissions: ["Manage Roles"]
  },
  {
    name: "unmute",
    description: "Unmute a user",
    usage: ",unmute @user",
    category: "Moderation",
    examples: [",unmute @user123"],
    permissions: ["Manage Roles"]
  },
  {
    name: "muteall",
    description: "Mute all users in the server",
    usage: ",muteall / ,ma <duration>",
    category: "Moderation",
    examples: [",muteall 30m", ",ma 1h"],
    permissions: ["Manage Roles"]
  },
  {
    name: "unmuteall",
    description: "Unmute all users in the server",
    usage: ",unmuteall / ,uma",
    category: "Moderation",
    examples: [",unmuteall", ",uma"],
    permissions: ["Manage Roles"]
  },
  {
    name: "ban",
    description: "Ban a user from the server",
    usage: ",ban @user [reason]",
    category: "Moderation",
    examples: [",ban @user123", ",ban @user123 Spam"],
    permissions: ["Ban Members"]
  },
  {
    name: "kick",
    description: "Kick a user from the server",
    usage: ",kick @user [reason]",
    category: "Moderation",
    examples: [",kick @user123", ",kick @user123 Spam"],
    permissions: ["Kick Members"]
  },
  {
    name: "warn",
    description: "Warn a user",
    usage: ",warn @user [reason]",
    category: "Moderation",
    examples: [",warn @user123", ",warn @user123 Bad behavior"],
    permissions: ["Manage Messages"]
  },
  {
    name: "warnings",
    description: "Show user warnings",
    usage: ",warnings @user",
    category: "Moderation",
    examples: [",warnings @user123"],
    permissions: ["Manage Messages"]
  },
  {
    name: "unban",
    description: "Unban a user",
    usage: ",unban <user_id>",
    category: "Moderation",
    examples: [",unban 123456789"],
    permissions: ["Ban Members"]
  },
  {
    name: "banall",
    description: "Ban all users in the server",
    usage: ",banall / ,ba",
    category: "Moderation",
    examples: [",banall", ",ba"],
    permissions: ["Ban Members"]
  },
  {
    name: "unbanall",
    description: "Unban all users from the server",
    usage: ",unbanall / ,uba",
    category: "Moderation",
    examples: [",unbanall", ",uba"],
    permissions: ["Ban Members"]
  },
  {
    name: "tempban",
    description: "Temporarily ban a user",
    usage: ",tempban / ,tban <user> <time>",
    category: "Moderation",
    examples: [",tempban @user123 1d", ",tban @user123 12h"],
    permissions: ["Ban Members"]
  },
  // Message / Utility Commands
  {
    name: "msg",
    description: "Send a message to a channel",
    usage: ",msg <channel_id> <message>",
    category: "Message / Utility",
    examples: [",msg 123456789 Hello world"],
    permissions: ["Send Messages"]
  },
  {
    name: "deletemsg",
    description: "Delete latest messages",
    usage: ",deletemsg <amount> / ,dm <amount>",
    category: "Message / Utility",
    examples: [",deletemsg 10", ",dm 25"],
    permissions: ["Manage Messages"]
  },
  {
    name: "deletemsgid",
    description: "Delete specific message by ID",
    usage: ",deletemsgid <message_id> / ,dmi <message_id>",
    category: "Message / Utility",
    examples: [",deletemsgid 123456789", ",dmi 987654321"],
    permissions: ["Manage Messages"]
  },
  {
    name: "purge",
    description: "Delete a specific amount of messages",
    usage: ",purge <amount> / ,p <amount>",
    category: "Message / Utility",
    examples: [",purge 10", ",p 25"],
    permissions: ["Manage Messages"]
  },
  {
    name: "purgeall",
    description: "Delete all messages in channel",
    usage: ",purgeall / ,pa",
    category: "Message / Utility",
    examples: [",purgeall", ",pa"],
    permissions: ["Manage Messages"]
  },
  {
    name: "limitmsgs",
    description: "Limit messages for a user",
    usage: ",limitmsgs @user <amount> / ,lm @user <amount>",
    category: "Message / Utility",
    examples: [",limitmsgs @user123 10", ",lm @user123 5"],
    permissions: []
  },
  {
    name: "cmds",
    description: "Show the number of commands",
    usage: ",cmds / ,commands",
    category: "Message / Utility",
    examples: [",cmds", ",commands"],
    permissions: []
  },
  {
    name: "cmdcount",
    description: "Show this command list",
    usage: ",cmdcount / ,cc",
    category: "Message / Utility",
    examples: [",cmdcount", ",cc"],
    permissions: []
  },
  {
    name: "resetlimitmsgs",
    description: "Remove message limit from a user",
    usage: ",resetlimitmsgs @user / ,rlm @user",
    category: "Message / Utility",
    examples: [",resetlimitmsgs @user123", ",rlm @user123"],
    permissions: []
  },
  {
    name: "assignlogchannel",
    description: "Assign a channel to log the messages of a user",
    usage: ",assignlogchannel / ,alc",
    category: "Message / Utility",
    examples: [",assignlogchannel", ",alc"],
    permissions: ["Manage Channels"]
  },
  {
    name: "resetassignedlogchannel",
    description: "Reset the assigned channel",
    usage: ",resetassignedlogchannel / ,ralc",
    category: "Message / Utility",
    examples: [",resetassignedlogchannel", ",ralc"],
    permissions: ["Manage Channels"]
  },
  {
    name: "msglog",
    description: "Start logging messages of a user to the assigned channel",
    usage: ",msglog @user / ,ml @user",
    category: "Message / Utility",
    examples: [",msglog @user123", ",ml @user123"],
    permissions: ["Manage Messages"]
  },
  {
    name: "stopmsglog",
    description: "Stop logging messages of a user",
    usage: ",stopmsglog @user / ,sml @user",
    category: "Message / Utility",
    examples: [",stopmsglog @user123", ",sml @user123"],
    permissions: ["Manage Messages"]
  },
  {
    name: "enableantispam",
    description: "Enable anti-spam in the current channel",
    usage: ",enableantispam / ,eas",
    category: "Message / Utility",
    examples: [",enableantispam", ",eas"],
    permissions: ["Manage Messages"]
  },
  {
    name: "disableantispam",
    description: "Disable anti-spam in the current channel",
    usage: ",disableantispam / ,das",
    category: "Message / Utility",
    examples: [",disableantispam", ",das"],
    permissions: ["Manage Messages"]
  },
  {
    name: "spamdm",
    description: "Spam a user's DMs with a message",
    usage: ",spamdm <userId/@mention> <message> <amount> / ,sd <userId/@mention> <message> <amount>",
    category: "Message / Utility",
    examples: [",spamdm @user123 Hello 5", ",sd 123456789 Test 3"],
    permissions: []
  },
  {
    name: "spam",
    description: "Spam a channel with a message",
    usage: ",spam <channelId> <message> <amount> / ,s <channelId> <message> <amount>",
    category: "Message / Utility",
    examples: [",spam 123456789 Hello 5", ",s 987654321 Test 3"],
    permissions: ["Send Messages"]
  },
  {
    name: "stopspamdm",
    description: "Stop DM spam for a user",
    usage: ",stopspamdm <userId/@mention> / ,ssd <userId/@mention>",
    category: "Message / Utility",
    examples: [",stopspamdm @user123", ",ssd 123456789"],
    permissions: []
  },
  {
    name: "stopspam",
    description: "Stop spam in a channel",
    usage: ",stopspam <channelId> / ,ss <channelId>",
    category: "Message / Utility",
    examples: [",stopspam 123456789", ",ss 987654321"],
    permissions: ["Send Messages"]
  },
  // Staff / Owner Commands
  {
    name: "serverwhitelist",
    description: "Whitelist server for bot usage",
    usage: ",serverwhitelist / ,sw <server_id>",
    category: "Staff / Owner",
    examples: [",serverwhitelist 123456789", ",sw 987654321"],
    permissions: ["Owner"]
  },
  {
    name: "unserverwhitelist",
    description: "Unwhitelist server (bot leaves)",
    usage: ",unserverwhitelist / ,unsw <server_id>",
    category: "Staff / Owner",
    examples: [",unserverwhitelist 123456789", ",unsw 987654321"],
    permissions: ["Owner"]
  },
  {
    name: "whitelistedservers",
    description: "Show whitelisted servers",
    usage: ",whitelistedservers / ,ws",
    category: "Staff / Owner",
    examples: [",whitelistedservers", ",ws"],
    permissions: ["Owner"]
  },
  {
    name: "tempserverwhitelist",
    description: "Temporarily whitelist server",
    usage: ",tempserverwhitelist / ,tsw <time>",
    category: "Staff / Owner",
    examples: [",tempserverwhitelist 24h", ",tsw 12h"],
    permissions: ["Owner"]
  },
  {
    name: "untempserverwhitelist",
    description: "Remove temporary whitelist and leave server",
    usage: ",untempserverwhitelist / ,utsw",
    category: "Staff / Owner",
    examples: [",untempserverwhitelist", ",utsw"],
    permissions: ["Owner"]
  }
];

const categories = Array.from(new Set(commands.map(cmd => cmd.category)));

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredCommands = useMemo(() => {
    return commands.filter(command => {
      const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           command.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           command.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (command.examples && command.examples.some(example => 
                             example.toLowerCase().includes(searchTerm.toLowerCase())
                           )) ||
                           (command.permissions && command.permissions.some(permission => 
                             permission.toLowerCase().includes(searchTerm.toLowerCase())
                           ));
      
      const matchesCategory = selectedCategory === "All" || command.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const AnimatedCommandCard = ({ command, index }: { command: Command; index: number }) => {
    const { ref, isVisible } = useScrollAnimation();
    
    return (
      <div
        ref={ref}
        className={`transform transition-all duration-700 ${
          isVisible 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-8 opacity-0'
        }`}
        style={{ 
          transitionDelay: `${index * 100}ms` 
        }}
      >
        <CommandCard
          name={command.name}
          description={command.description}
          usage={command.usage}
          category={command.category}
          examples={command.examples}
          permissions={command.permissions}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-glow opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-subtle pointer-events-none" />
      
      {/* Floating Orbs */}
      <div className="fixed top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float opacity-60" />
      <div className="fixed top-40 right-32 w-48 h-48 bg-secondary/10 rounded-full blur-xl animate-float opacity-40" style={{ animationDelay: "-3s" }} />
      <div className="fixed bottom-32 left-1/3 w-24 h-24 bg-neon-pink/10 rounded-full blur-xl animate-float opacity-50" style={{ animationDelay: "-1.5s" }} />

      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      
      <main className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Category Filter */}
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            {["All", ...categories].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "glass-panel text-muted-foreground hover:text-primary hover:bg-primary/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Commands Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommands.map((command, index) => (
              <AnimatedCommandCard
                key={command.name}
                command={command}
                index={index}
              />
            ))}
          </div>

          {/* No Results */}
          {filteredCommands.length === 0 && (
            <div className="text-center py-12">
              <div className="glass-panel p-8 max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No commands found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or category filter
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-16 text-center">
            <div className="glass-panel p-6 max-w-md mx-auto">
              <p className="text-muted-foreground">
                Showing <span className="text-primary font-semibold">{filteredCommands.length}</span> of{" "}
                <span className="text-primary font-semibold">{commands.length}</span> commands
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Version Text */}
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground/60 pointer-events-none">
        V.01
      </div>
    </div>
  );
};

export default Index;