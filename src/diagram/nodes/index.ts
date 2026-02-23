import RootNode from "./RootNode";
import ActionNode from "./ActionNode";
import GatewayNode from "./GatewayNode";
import RegistryNode from "./RegistryNode";
import GroupNode from "./GroupNode";
import ResolverNode from "./ResolverNode";

export const nodeTypes = {
  root: RootNode,
  action: ActionNode,
  gateway: GatewayNode,
  registry: RegistryNode,
  group: GroupNode,
  resolver: ResolverNode,
};

export { RootNode, ActionNode, GatewayNode, RegistryNode, GroupNode, ResolverNode };
