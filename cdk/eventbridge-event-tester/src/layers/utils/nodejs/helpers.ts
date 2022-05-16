export class Helpers {
    static timestampInSeconds = (date: Date): string => {
        return `${Math.floor(date.getTime() / 1000)}`;
    }
    
    static addDays = (date: number, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static extractEventId = (payload: string): string => {
        // since the json object might be broken, we need to exract the value without parsing the json
        const value = '\"eventId\":\"';
        const firstIndex = payload.indexOf(value)+value.length;
        const lastIndex = payload.indexOf('\"', firstIndex+1);
        const eventId = payload.substring(firstIndex, lastIndex);
        return eventId;
    }
}