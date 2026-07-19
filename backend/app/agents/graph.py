from langgraph.graph import END, StateGraph

from app.agents.segmentation_agent import run_segmentation_agent
from app.agents.state import VideoState
from app.agents.synthesis_agent import run_synthesis_agent
from app.agents.transcript_agent import run_transcript_agent
from app.agents.visual_agent import run_visual_agent


def build_graph():
    graph = StateGraph(VideoState)

    graph.add_node("transcript", run_transcript_agent)
    graph.add_node("visual", run_visual_agent)
    graph.add_node("segmentation", run_segmentation_agent)
    graph.add_node("synthesis", run_synthesis_agent)

    # Transcript and visual don't depend on each other -- if you want true
    # parallelism, fan both out from the entry point and add a small joiner
    # node before segmentation. Kept sequential here for a simpler first
    # pass; it's a one-line change once you're ready for it.
    graph.set_entry_point("transcript")
    graph.add_edge("transcript", "visual")
    graph.add_edge("visual", "segmentation")
    graph.add_edge("segmentation", "synthesis")
    graph.add_edge("synthesis", END)

    return graph.compile()


video_graph = build_graph()
