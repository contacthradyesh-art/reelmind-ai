export type MemeTemplate = { id: string; title: string; category: string; top: string; bottom: string; background: string; textColor: string; font: "Anton" | "Poppins" | "Georgia"; };
export const memeTemplates: MemeTemplate[] = [
 {id:"expect-reality",title:"Expectation vs Reality",category:"Relatable",top:"EXPECTATION",bottom:"REALITY",background:"#7c2d12",textColor:"#ffffff",font:"Anton"},
 {id:"me-also-me",title:"Me vs Me",category:"Relatable",top:"ME: I'LL SLEEP EARLY",bottom:"ALSO ME AT 2 AM",background:"#111827",textColor:"#fef08a",font:"Anton"},
 {id:"exam-mode",title:"Exam Mode",category:"Study",top:"SYLLABUS: 100 CHAPTERS",bottom:"ME: KAL SE PADHUNGA",background:"#164e63",textColor:"#ecfeff",font:"Poppins"},
 {id:"pov",title:"POV Moment",category:"Trending",top:"POV:",bottom:"YOU OPENED ONE REEL",background:"#312e81",textColor:"#ffffff",font:"Anton"},
 {id:"monday",title:"Monday Mood",category:"Work",top:"SUNDAY NIGHT",bottom:"MONDAY MORNING",background:"#3f3f46",textColor:"#ffffff",font:"Georgia"},
 {id:"plot-twist",title:"Plot Twist",category:"Reaction",top:"I HAD A PLAN",bottom:"THE PLAN HAD OTHER PLANS",background:"#701a75",textColor:"#fdf4ff",font:"Anton"},
 {id:"friendship",title:"Best Friend Logic",category:"Friends",top:"I'M ON MY WAY",bottom:"STILL LOOKING FOR SOCKS",background:"#9d174d",textColor:"#fff1f2",font:"Poppins"},
 {id:"budget",title:"Budget Check",category:"Money",top:"BANK BALANCE",bottom:"CONFIDENCE LEVEL",background:"#14532d",textColor:"#dcfce7",font:"Anton"},
 {id:"introvert",title:"Introvert Energy",category:"Mood",top:"LET'S GO OUT",bottom:"CANCELLED. PEACE RESTORED.",background:"#1e293b",textColor:"#e2e8f0",font:"Georgia"},
 {id:"small-win",title:"Small Win",category:"Motivation",top:"ONE SMALL STEP",bottom:"STILL COUNTS ✨",background:"#581c87",textColor:"#f5d0fe",font:"Poppins"}
];
