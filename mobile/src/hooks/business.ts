import { LoginBusiness } from "@/api/authApi";
import { getAllBusiness, getTableByBusinessId } from "@/api/businessApi";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useBusiness(){
    return useMutation({
        mutationKey:['login-business'],
        mutationFn:(body:{email:string,password:string})=>LoginBusiness(body)
    })
}
export function useGetAllBusiness(){
    return useQuery({
        queryKey:['all-business'],
        queryFn:getAllBusiness
    })
} 
export function useGetAllTables(businessId:string){
    return useQuery({
        queryKey:["all-tables",businessId],
        queryFn:()=>getTableByBusinessId(businessId),
        enabled:!!businessId
    })
}