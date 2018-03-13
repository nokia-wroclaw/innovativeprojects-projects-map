﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.ExceptionServices;
using System.Web;
using ProjectsMap.WebApi.DTOs;
using ProjectsMap.WebApi.Models;

namespace ProjectsMap.WebApi.Mappers
{
    public class DTOMapper
    {
        public static EmployeeDto GetEmployeeDto(Employee employee)
        {
            var dto = new EmployeeDto()
            {
                ManagerCompanyId = employee.ManagerCompanyId,
                Id = employee.DeveloperId,
                ManagerId = employee.ManagerId,
                CompanyId = employee.CompanyId,
                FirstName = employee.FirstName,
                Surname = employee.Surname,
                Email = employee.Email,
                CompanyName = employee.Company.Name,
                JobTitle = employee.JobTitle,
                Technologies = employee.Technologies.Select(x => x.Name).ToList(),
            };

            if (employee.Seat == null || employee.Seat.Count == 0)
                dto.Seat = null;
            else
            {
                var seatDto = new SeatDto()
                {
                    Id = employee.Seat.ToList()[0].SeatId,
                    DeveloperId = employee.DeveloperId,
                    Vertex = employee.Seat == null ? null : GetVertexDto(employee.Seat.ToList()[0].Vertex),
                    RooomId = employee.Seat.ToList()[0].SeatId
                };
                dto.Seat = seatDto;
            }


            return dto;
        }

        public static VertexDto GetVertexDto(Vertex vertex)
        {
            var dto = new VertexDto()
            {
                X = vertex.X,
                Y = vertex.Y
            };
            return dto;
        }

        public static TechnologyDto GeTechnologyDto(Technology technology)
        {
            var dto = new TechnologyDto()
            {
                Name = technology.Name,
                Id = technology.TechnologyId,
                DevelopersId = technology.Developers.Select(x => x.DeveloperId).ToList(),
                ProjectsId = technology.Projects.Select(p => p.ProjectId).ToList()
            };

            return dto;
        }

        public static WallDto GetWallDto(Wall wall)
        {
            var dto = new WallDto()
            {
                Id = wall.WallId,
                StartVertex = GetVertexDto(wall.StartVertex),
                EndVertex = GetVertexDto(wall.EndVertex)
            };
            return dto;
        }

        public static RoomDto GetRoomDto(Room room)
        {
            var dto = new RoomDto()
            {
                Id = room.RoomId,
                Walls = GetWallsDtoList(room.Walls.ToList()),
                Seats = room.Seats.Select(s => GetVertexDto(s.Vertex)).ToList()
            };
            return dto;
        }

        public static List<WallDto> GetWallsDtoList(List<Wall> walls)
        {
            var list = new List<WallDto>();
            var current = walls[0];
            do
            {
                list.Add(GetWallDto(current));
                var end = current.EndVertex;
                var next = walls.FirstOrDefault(w => w.StartVertex.X == end.X && w.StartVertex.Y == end.Y);
                current = next;
            } while (list.Count < walls.Count);

            return list;
        }

        public static SeatDto GetSeatDto(Seat seat)
        {
            var result = new SeatDto()
            {
                Id = seat.SeatId,
                DeveloperId = seat.DeveloperId,
                RooomId = seat.RoomId,
                Vertex = GetVertexDto(seat.Vertex)
            };
            return result;
        }

        public static BuildingDto GetBuildingDto(Building building)
        {
            return new BuildingDto()
            {
                Id = building.BuildingId,
                Address = building.Address,
				FloorsIds = building.Floors.Select(f => f.FloorId).ToList(),
				CompanyId = building.CompanyId
            };
        }

        public static CompanyDto GetCompanyDto(Company company)
        {
            return new CompanyDto()
            {
                Id = company.CompanyId,
                Name = company.Name,
                Buildings = company.Buildings.Select(b => GetBuildingDto(b)).ToList(),
                Developers = company.Developers.Select(d => GetEmployeeDto(d)).ToList(),
                ProjectsId = company.Projects.Select(p =>
                {
                    return new ProjectDtoShort()
                    {
                        Id = p.ProjectId,
                        Name = p.Description
                    };
                }).ToList()  
            };

        }

        public static List<VertexDto> GetSortedList(List<Vertex> vertices)
        {
          
            var result = vertices.Select(v => GetVertexDto(v)).ToList();
            result.Sort((pointA, pointB) =>
            {
                VertexDto center = new VertexDto()
                {
                    X = ((vertices.Max(v => v.X) - vertices.Min(v => v.X)) / 2) + vertices.Min(v => v.X),
                    Y = (vertices.Max(v => v.Y) - vertices.Min(v => v.Y) / 2) + vertices.Min(v => v.Y)
                };

                if (pointA.X - center.X >= 0 && pointB.X - center.X < 0)
                    return 1;
                if (pointA.X - center.X < 0 && pointB.X - center.X >= 0)
                    return -1;

                if (pointA.X - center.X == 0 && pointB.X - center.X == 0)
                {
                    if (pointA.Y - center.Y >= 0 || pointB.Y - center.Y >= 0)
                        if (pointA.Y > pointB.Y)
                            return 1;
                        else return -1;
                    if (pointB.Y > pointA.Y)
                        return 1;
                    else return -1;
                }

                // compute the cross product of vectors (CenterPoint -> a) x (CenterPoint -> b)
                double det = (pointA.X - center.X) * (pointB.Y - center.Y) -
                             (pointB.X - center.X) * (pointA.Y - center.Y);
                if (det < 0)
                    return 1;
                if (det > 0)
                    return -1;

                // points a and b are on the same line from the CenterPoint
                // check which point is closer to the CenterPoint
                double d1 = (pointA.X - center.X) * (pointA.X - center.X) +
                            (pointA.Y - center.Y) * (pointA.Y - center.Y);
                double d2 = (pointB.X - center.X) * (pointB.X - center.X) +
                            (pointB.Y - center.Y) * (pointB.Y - center.Y);
                if (d1 > d2)
                    return 1;
                else return -1;

            });

            return result;
        }

		public static FloorDto GetFloorDto(Floor floor)
		{
			var result = new FloorDto()
			{
				Id = floor.FloorId,
				Description = floor.Description,
				BuildingId = floor.BuildingId,
				Walls = GetWallsDtoListNotSorted(floor.Walls.ToList()),
				Rooms = GetRoomsDtoList(floor.Rooms.ToList()),
				FloorNumber = floor.FloorNumber
			};
			return result;
		}
		public static FloorDto GetFloorDtoListElement(Floor floor)
		{
			var result = new FloorDto()
			{
				Id = floor.FloorId,
				Description = floor.Description,
				BuildingId = floor.BuildingId,
				FloorNumber = floor.FloorNumber
			};
			return result;
		}
		public static List<RoomDto> GetRoomsDtoList(List<Room> rooms)
		{
			var list = new List<RoomDto>();
			foreach(Room room in rooms)
			{
				list.Add(GetRoomDto(room));
			}
			return list;
		}

		private static IEnumerable<WallDto> GetWallsDtoListNotSorted(List<Wall> listWalls)
		{
			var listWallsDto = new List<WallDto>();
			foreach(Wall wall in listWalls)
			{
				listWallsDto.Add(GetWallDto(wall));
			}
			return listWallsDto;
		}

		/*public static List<WallDto> GetWallsDtoList(List<Wall> walls)
        {
            var list = new List<WallDto>();
            var current = walls[0];
            do
            {
                list.Add(GetWallDto(current));
                var end = current.EndVertex;
                var next = walls.FirstOrDefault(w => w.StartVertex.X == end.X && w.StartVertex.Y == end.Y);
                current = next;
            } while (list.Count < walls.Count);

            return list;
        }}*/

	}
}