from langgraph.graph import END, StateGraph

from app.agents.segmentation_agent import run_segmentation_agent
from app.agents.state import VideoState
from app.agents.synthesis_agent import run_synthesis_agent
from app.agents.transcript_agent import run_transcript_agent
from app.agents.visual_agent import run_visual_agent


def build_graph():
    graph = StateGraph(VideoState)

    # Node names are suffixed with "_agent" so they can never collide with a
    # VideoState field name -- LangGraph rejects a node name that matches a
    # state key (e.g. a node literally called "transcript" clashes with the
    # state's own `transcript` field).
    graph.add_node("transcript_agent", run_transcript_agent)
    graph.add_node("visual_agent", run_visual_agent)
    graph.add_node("segmentation_agent", run_segmentation_agent)
    graph.add_node("synthesis_agent", run_synthesis_agent)

    # Transcript and visual don't depend on each other -- if you want true
    # parallelism, fan both out from the entry point and add a small joiner
    # node before segmentation. Kept sequential here for a simpler first
    # pass; it's a one-line change once you're ready for it.
    graph.set_entry_point("transcript_agent")
    graph.add_edge("transcript_agent", "visual_agent")
    graph.add_edge("visual_agent", "segmentation_agent")
    graph.add_edge("segmentation_agent", "synthesis_agent")
    graph.add_edge("synthesis_agent", END)

    return graph.compile()


video_graph = build_graph()
