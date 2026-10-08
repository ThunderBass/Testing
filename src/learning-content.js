const repository = 'https://github.com/PacktPublishing/Cisco-CCNA-200-301-The-Complete-Guide-to-Getting-Certified';
const revision = '6603a64e014dc7fa9fa0cb28a0ca383490e4b844';
const sourceLink = (path) => `${repository}/blob/${revision}/${path.split('/').map(encodeURIComponent).join('/')}`;
const link = (label, path) => ({ label, url: sourceLink(path) });

export const domainMeta = [
  { domain: 'Foundations, IOS and addressing', title: 'Network foundations', shortDescription: 'IOS, subnetting, IPv6 and Ethernet', icon: 'network', count: 8 },
  { domain: 'Switching and wireless', title: 'Switching & wireless', shortDescription: 'VLANs, STP, EtherChannel and WLANs', icon: 'layers', count: 6 },
  { domain: 'Routing and packet forwarding', title: 'Routing & forwarding', shortDescription: 'Route selection, static routes and OSPF', icon: 'route', count: 6 },
  { domain: 'IP services', title: 'IP services', shortDescription: 'DHCP, relay and address translation', icon: 'server', count: 4 },
  { domain: 'Security fundamentals', title: 'Security fundamentals', shortDescription: 'ACLs, port security and secure access', icon: 'shield', count: 4 },
  { domain: 'Automation', title: 'Automation', shortDescription: 'JSON and controller architecture', icon: 'code', count: 2 },
];

export const sourceGroups = [
  {
    id: 'foundations', title: 'Foundations, IOS & addressing',
    sections: 'Study notes 04-04/05, 08-04/10/11, 12-05, 14-06 and 30-03/04/07',
    topics: 'IOS configuration, subnet boundaries and VLSM, IPv6 notation and scope, ARP and interface state.',
    links: [
      link('04-05 · IOS configuration management', 'Study Notes/04 The IOS Operating System/04-05 IOS Configuration Management.pdf'),
      link('08-04 · Subnetting and VLSM', 'Study Notes/08 Subnetting/08-04 Subnetting Class C Networks and VLSM.pdf'),
      link('12-05 · ARP for routed traffic', 'Study Notes/12 The Life of a Packet/12-05 ARP for Routed Traffic.pdf'),
      link('30-07 · IPv6 local addresses', 'Study Notes/30 IPv6 Addressing and Routing/30-07 Unique Local and Link Local Addresses.pdf'),
    ],
  },
  {
    id: 'switching', title: 'Switching & wireless',
    sections: 'Study notes 21-05/07, 22-03/04, 25-05/11, 26-04, 37-04/06/07; lab guides 22 and 26',
    topics: 'Access and trunk ports, inter-VLAN routing, STP, BPDU Guard, LACP and wireless controllers.',
    links: [
      link('21-07 · VLAN trunk ports', 'Study Notes/21 VLANs - Virtual Local Area Networks/21-07 VLAN Trunk Ports.pdf'),
      link('25-11 · PortFast and guard features', 'Study Notes/25 STP - Spanning Tree Protocol/25-11 Portfast, BPDU Guard and Root Guard.pdf'),
      link('26-04 · EtherChannel configuration', 'Study Notes/26 EtherChannel/26-04 EtherChannel Protocols and Configuration.pdf'),
      link('37-04 · Wireless controllers and CAPWAP', 'Study Notes/37 Wireless Fundamentals/37-04 Wireless LAN Controllers and CAPWAP.pdf'),
    ],
  },
  {
    id: 'routing', title: 'Routing & packet forwarding',
    sections: 'Study notes 16-02/04/06, 17-10/15 and 20-03/12; lab guides 16 and 18',
    topics: 'Connected, static and default routes, longest-prefix match, administrative distance and OSPF.',
    links: [
      link('16-06 · Route summaries and longest-prefix match', 'Study Notes/16 Routing Fundamentals/16-06 Summarisation, Longest Prefix Match, and Default Routes.pdf'),
      link('17-10 · Administrative distance', 'Study Notes/17 Dynamic Routing Protocols/17-10 Administrative Distance.pdf'),
      link('20-12 · OSPF adjacencies', 'Study Notes/20 OSPF - Open Shortest Path First/20-12 OSPF Adjacencies.pdf'),
    ],
  },
  {
    id: 'services', title: 'IP services',
    sections: 'Study notes 23-02/03/04 and 29-03/04/06/08; DHCP and NAT lab guides',
    topics: 'DHCP sequence, server pools and relay, static/dynamic NAT, PAT and translation tables.',
    links: [
      link('23-03 · Cisco DHCP server', 'Study Notes/23 DHCP - Dynamic Host Configuration Protocol/23-03 Cisco DHCP Server.pdf'),
      link('23-04 · External DHCP server', 'Study Notes/23 DHCP - Dynamic Host Configuration Protocol/23-04 External DHCP Server.pdf'),
      link('29-08 · Port Address Translation', 'Study Notes/29 NAT - Network Address Translation/29-08 PAT Port Address Translation.pdf'),
    ],
  },
  {
    id: 'security', title: 'Security fundamentals',
    sections: 'Study notes 27-02/05, 28-02/03/04/05 and 33-06; lab guides 27, 28 and 33',
    topics: 'Port security behavior, ACL syntax and processing, DHCP snooping and SSH access.',
    links: [
      link('27-05 · Port security', 'Study Notes/27 Switch Security/27-05 Preventing Unauthorised Devices with Port Security.pdf'),
      link('28-05 · ACL operations', 'Study Notes/28 ACLs - Access Control Lists/28-05 ACL Operations.pdf'),
      link('33-06 · Secure Shell', 'Study Notes/33 Cisco Device Security/33-06 SSH Secure Shell.pdf'),
    ],
  },
  {
    id: 'automation', title: 'Automation & further reading',
    sections: 'Study notes 38-02/04/05/06/08/10/11, 39-02/03 and 34-02/05',
    topics: 'JSON and controller APIs are tested. Further reading covers REST, configuration tools, AI, Syslog and SNMP.',
    links: [
      link('38-04 · Serialization formats', 'Study Notes/38 Network Automation and Programmability/38-04 Data Serialization Formats - XML, JSON and YAML.pdf'),
      link('38-10 · Software Defined Networking', 'Study Notes/38 Network Automation and Programmability/38-10 SDN Software Defined Networking.pdf'),
      link('38-08 · Ansible and Terraform', 'Study Notes/38 Network Automation and Programmability/38-08 Configuration Management Tools - Ansible and Terraform.pdf'),
    ],
  },
  {
    id: 'inventory', title: 'Reference coverage',
    sections: 'README, selected extracted PDF text and a small Anki v1.4 sample',
    topics: 'The README, 62 selected study-note/lab PDFs and 11 complete text notes from the Anki deck were used as references. This is partial resource coverage, not the full textbook or course.',
    links: [
      link('Repository README', 'README.md'),
      link('Sampled Anki v1.4 archive', 'Anki Flashcards/Flackbox Anki Flashcards CCNA 200-301 v1.4.zip'),
    ],
  },
];

export const coverageNotes = [
  'This is an original practice exam grounded in selected Packt repository material. Its 30-question count, scoring and topic proportions are practice settings, not official Cisco exam settings.',
  'Current Cisco exam-version alignment, official topic weights and a complete blueprint comparison have not been verified for this question set.',
  'PDF text was reviewed, but most embedded diagrams were not. Seven demo PDFs yielded almost no usable text and were excluded. Packet Tracer .pkt projects were neither decoded nor executed; CLI questions are text simulations.',
  'The Anki v1.4 sample contains 11 complete text notes. Remaining notes, image-occlusion media, the older deck, most archives, external paid material and the complete course were not reviewed.',
  'The fixed exam samples only part of the reference material. Syslog/SNMP details, DHCP snooping, wireless channel/security details, broader REST/configuration tools and AI notes are not tested. QoS, WAN, cloud and NTP sections were not used.',
  'No supplemental question coverage is included. Practice performance does not establish an official pass or guarantee exam readiness.',
];

export const labRecommendations = [
  {
    id: 'addressing', title: 'Build and verify an addressing plan', domain: 'Foundations, IOS and addressing', original: true,
    sourceSection: '08-04 Subnetting and VLSM; lab 16, Connected and Local Routes',
    sourceUrl: sourceLink('Lab Guide - External/16 Routing Fundamentals Lab Exercises/16 Routing Fundamentals Lab Exercise.pdf'),
    steps: [
      'Original practice lab: divide 192.168.50.0/24 into nonoverlapping LANs for 50, 25 and 10 hosts. Record each prefix, usable range and broadcast address.',
      'In your own simulator topology, connect the LANs to a router and assign each router LAN interface the first usable address. Configure matching host addresses and gateways.',
      'Use show ip interface brief and show ip route to verify interface state and connected/local routes. Test local and routed reachability.',
      'Save the configuration, reload the simulated router, and verify the addressing and routes again.',
    ],
  },
  {
    id: 'vlans', title: 'Connect two VLANs', domain: 'Switching and wireless', original: false,
    sourceSection: 'Lab 22, VTP/Access/Trunk Ports and Router on a Stick',
    sourceUrl: sourceLink('Lab Guide - External/22 VLAN and Inter-VLAN Routing Configuration Lab Exercises/22-1 VLAN and Inter-VLAN Routing Configuration Lab Exercise.pdf'),
    steps: [
      'Open the lab PDF and its supplied Packet Tracer project locally; use the diagram for the exact interfaces and addressing.',
      'Configure the access VLANs and switch trunks in the access/trunk section. Verify same-VLAN reachability across the switches.',
      'Complete the router-on-a-stick section with router subinterfaces, matching 802.1Q VLAN IDs and the router-facing switch trunk.',
      'Check host gateways, then verify the Eng and Sales hosts can reach each other. Compare the result with the Layer 3 switch section.',
    ],
  },
  {
    id: 'etherchannel', title: 'Bring up an LACP bundle', domain: 'Switching and wireless', original: false,
    sourceSection: 'Lab 26, LACP EtherChannel Configuration, steps 1–3',
    sourceUrl: sourceLink('Lab Guide - External/26 EtherChannel Configuration Lab Exercises/26-1 EtherChannel Configuration Lab Exercise.pdf'),
    steps: [
      'Open the supplied lab topology and identify Acc3’s uplinks to each distribution switch.',
      'Convert the intended link pairs to LACP EtherChannels, keeping the member settings consistent. Add useful port-channel descriptions.',
      'Verify bundled members with show etherchannel summary and check end-host connectivity.',
    ],
  },
  {
    id: 'routing', title: 'Trace a packet in both directions', domain: 'Routing and packet forwarding', original: false,
    sourceSection: 'Lab 16, Static Routes, Summary Routes and Longest Prefix Match',
    sourceUrl: sourceLink('Lab Guide - External/16 Routing Fundamentals Lab Exercises/16 Routing Fundamentals Lab Exercise.pdf'),
    steps: [
      'Use the supplied routing lab topology and addressing. Configure the required static routes and verify PC1-to-PC3 connectivity.',
      'Complete the summary-route section, comparing the routing table before and after the replacement.',
      'In the longest-prefix section, predict both the forward and return paths before sending traffic.',
      'Use route-table entries, ping and traceroute results to explain the observed paths and verify the final configuration.',
    ],
  },
  {
    id: 'dhcp', title: 'Move DHCP across a router', domain: 'IP services', original: false,
    sourceSection: 'Lab 23, Cisco DHCP Server and External DHCP Server',
    sourceUrl: sourceLink('Lab Guide - External/23 DHCP Configuration Lab Exercises/23-1 DHCP Configuration Lab Exercise.pdf'),
    steps: [
      'Open the supplied DHCP lab. Configure the router pool, reserved addresses, default gateway and DNS settings required by the guide.',
      'Renew the clients’ leases, check their addressing, and verify the router’s DHCP bindings.',
      'Follow the cleanup and migration steps to move DHCP service to the external server. Place the helper on the client-facing router interface.',
      'Renew client leases again and confirm the address, gateway, DNS settings and connectivity.',
    ],
  },
  {
    id: 'pat', title: 'Follow a PAT translation', domain: 'IP services', original: false,
    sourceSection: 'Lab 29, Dynamic NAT and Port Address Translation PAT',
    sourceUrl: sourceLink('Lab Guide - External/29 NAT Configuration Lab Exercises/29-1 NAT Configuration Lab Exercise.pdf'),
    steps: [
      'Use the lab’s addressed topology. Configure the dynamic NAT pool and identify what happens when the pool is exhausted.',
      'Follow the cleanup and PAT section to obtain the WAN address through DHCP and overload the outside interface address.',
      'Generate traffic from two inside PCs and immediately inspect show ip nat translations before the dynamic entries expire.',
      'Explain the inside-local and inside-global values for each flow, then inspect show ip nat statistics.',
    ],
  },
  {
    id: 'acl', title: 'Prove an ACL policy', domain: 'Security fundamentals', original: false,
    sourceSection: 'Lab 28, Numbered Standard, Numbered Extended and Named Extended ACLs',
    sourceUrl: sourceLink('Lab Guide - External/28 ACL Configuration Lab Exercises/28-1 ACL Configuration Lab Exercise.pdf'),
    steps: [
      'Open the supplied ACL lab and confirm baseline connectivity before applying filters.',
      'Implement the guide’s standard and extended policies, checking entry order, interface placement and traffic direction.',
      'Run the guide’s permitted/denied ping and Telnet tests in the isolated simulator, including traffic that should remain unaffected.',
      'Inspect ACL match counters, then compare the numbered and named extended ACL sections.',
    ],
  },
  {
    id: 'automation', title: 'Describe a controller-managed network', domain: 'Automation', original: true,
    sourceSection: '38-04, JSON Data Types; 38-10, SDN Architecture',
    sourceUrl: sourceLink('Study Notes/38 Network Automation and Programmability/38-04 Data Serialization Formats - XML, JSON and YAML.pdf'),
    steps: [
      'Original practice lab: write a JSON object describing two interfaces, using an array, string names, numeric VLAN IDs and boolean enabled values.',
      'Validate it with JSON.parse in a browser console and identify every value’s data type.',
      'Draw an application, controller and two switches. Label the northbound and southbound API relationships and identify where packet forwarding takes place.',
    ],
  },
];

// Input: one row per domain, with { domain, attempted, correct }.
// No unanswered area is described as a demonstrated weakness or strength.
export function getStudyPriorities(results = []) {
  const rows = Array.isArray(results) ? results : (results.topics ?? results.domainStats ?? []);
  const areas = domainMeta.map((meta) => {
    const row = rows.find((entry) => entry.domain === meta.domain || entry.topic === meta.domain) ?? {};
    const attempted = Math.max(0, Number(row.attempted ?? 0));
    const correct = Math.min(attempted, Math.max(0, Number(row.correct ?? 0)));
    const incorrect = attempted - correct;
    const accuracy = attempted ? correct / attempted : null;
    let reason;
    if (!attempted) reason = 'Not assessed yet. Complete a few questions before drawing conclusions.';
    else if (incorrect) reason = `${incorrect} of ${attempted} attempted questions missed. Review the explanations and practise the related lab.`;
    else reason = `All ${attempted} attempted questions correct. Use a new task to test transfer before treating this area as secure.`;
    const caution = attempted < 3 ? 'Small sample: fewer than three attempts.' : 'This is a limited sample of the topic.';
    return { ...meta, attempted, correct, incorrect, accuracy, reason, caution,
      labs: labRecommendations.filter((lab) => lab.domain === meta.domain) };
  });
  return areas.sort((a, b) => {
    const category = (area) => area.incorrect > 0 ? 0 : area.attempted === 0 ? 1 : 2;
    return category(a) - category(b)
      || (a.accuracy ?? 0) - (b.accuracy ?? 0)
      || b.incorrect - a.incorrect
      || a.attempted - b.attempted;
  }).slice(0, 3);
}
