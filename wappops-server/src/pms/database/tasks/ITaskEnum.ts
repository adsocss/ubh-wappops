export type TaskEnumType = 'priority' | 'status' | 'target-type';
export type TaskStatusCode = 'pending' | 'active' | 'closed';
export type TaskPriorityCode = 'low' | 'medium' | 'high' | 'urgent';
export type TaskTargetCode = 'asset' | 'location' | 'room';

export interface ITaskEnum<T extends TaskEnumType> {
    id: number
    type: T
    enumValue: number
    order: number
    code: TaskStatusCode | TaskPriorityCode | TaskTargetCode | undefined
    name: string
    isDefault: boolean    
}